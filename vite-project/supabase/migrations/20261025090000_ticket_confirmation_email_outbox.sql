-- Durable, private email outbox for paid ticket orders.
-- Apply this migration in the Supabase SQL editor or with Supabase CLI.

create table if not exists public.ticket_confirmation_outbox (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  generation integer not null default 1 check (generation > 0),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'accepted', 'failed', 'expired')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz default now(),
  generation_started_at timestamptz not null default now(),
  locked_until timestamptz,
  last_manual_requested_at timestamptz,
  last_attempt_at timestamptz,
  accepted_at timestamptz,
  resend_email_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ticket_confirmation_outbox_due_idx
  on public.ticket_confirmation_outbox (next_attempt_at, created_at)
  where status in ('pending', 'failed', 'processing');

alter table public.ticket_confirmation_outbox enable row level security;

-- No direct browser access: only the server's service-role client may use this table.
revoke all on table public.ticket_confirmation_outbox from public, anon, authenticated;
grant all on table public.ticket_confirmation_outbox to service_role;

create or replace function public.enqueue_paid_ticket_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'paid' then
      insert into public.ticket_confirmation_outbox (order_id)
      values (new.id)
      on conflict (order_id) do nothing;
    end if;
  elsif tg_op = 'UPDATE' then
    if new.status = 'paid' and old.status is distinct from 'paid' then
      insert into public.ticket_confirmation_outbox (order_id)
      values (new.id)
      on conflict (order_id) do nothing;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.enqueue_paid_ticket_confirmation() from public, anon, authenticated;

drop trigger if exists orders_enqueue_ticket_confirmation on public.orders;
create trigger orders_enqueue_ticket_confirmation
after insert or update on public.orders
for each row execute function public.enqueue_paid_ticket_confirmation();

-- Cover paid orders that existed before this migration was installed.
insert into public.ticket_confirmation_outbox (order_id)
select o.id
from public.orders o
where o.status = 'paid'
  and exists (
    select 1 from public.tickets t where t.order_id = o.id
  )
on conflict (order_id) do nothing;

create or replace function public.claim_ticket_confirmation(
  p_order_id uuid default null,
  p_lease_seconds integer default 120
)
returns setof public.ticket_confirmation_outbox
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
begin
  update public.ticket_confirmation_outbox outbox
  set status = 'expired',
      next_attempt_at = null,
      locked_until = null,
      updated_at = now()
  where outbox.status in ('pending', 'failed', 'processing')
    and outbox.attempt_count >= 6
    and (outbox.locked_until is null or outbox.locked_until < now());

  update public.ticket_confirmation_outbox outbox
  set status = 'expired',
      next_attempt_at = null,
      locked_until = null,
      updated_at = now()
  where outbox.status in ('pending', 'failed', 'processing')
    and outbox.generation_started_at < now() - interval '23 hours'
    and (outbox.locked_until is null or outbox.locked_until < now());

  select outbox.order_id
    into v_order_id
  from public.ticket_confirmation_outbox outbox
  join public.orders orders on orders.id = outbox.order_id
  where (p_order_id is null or outbox.order_id = p_order_id)
    and orders.status = 'paid'
    and exists (
      select 1 from public.tickets tickets where tickets.order_id = orders.id
    )
    and outbox.attempt_count < 6
    and outbox.generation_started_at >= now() - interval '23 hours'
    and (
      (outbox.status in ('pending', 'failed') and outbox.next_attempt_at <= now())
      or (outbox.status = 'processing' and outbox.locked_until < now())
    )
  order by outbox.next_attempt_at nulls first, outbox.created_at
  limit 1
  for update of outbox skip locked;

  if v_order_id is null then
    return;
  end if;

  return query
  update public.ticket_confirmation_outbox outbox
  set status = 'processing',
      attempt_count = outbox.attempt_count + 1,
      last_attempt_at = now(),
      locked_until = now() + make_interval(secs => least(greatest(p_lease_seconds, 30), 300)),
      updated_at = now()
  where outbox.order_id = v_order_id
  returning outbox.*;
end;
$$;

create or replace function public.finish_ticket_confirmation(
  p_order_id uuid,
  p_generation integer,
  p_provider_id text,
  p_error text,
  p_retry_after_seconds integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.ticket_confirmation_outbox outbox
  set status = case
        when p_provider_id is not null then 'accepted'
        when outbox.attempt_count >= 6
          or outbox.generation_started_at < now() - interval '23 hours' then 'expired'
        else 'failed'
      end,
      next_attempt_at = case
        when p_provider_id is null
          and outbox.attempt_count < 6
          and outbox.generation_started_at >= now() - interval '23 hours'
          then now() + make_interval(secs => least(greatest(coalesce(p_retry_after_seconds, 60), 1), 21600))
        else null
      end,
      locked_until = null,
      accepted_at = case when p_provider_id is not null then now() else outbox.accepted_at end,
      resend_email_id = case when p_provider_id is not null then p_provider_id else outbox.resend_email_id end,
      last_error = case when p_provider_id is null then left(coalesce(p_error, 'Email provider request failed.'), 300) else null end,
      updated_at = now()
  where outbox.order_id = p_order_id
    and outbox.generation = p_generation
    and outbox.status = 'processing';

  if not found then
    raise exception 'Ticket confirmation claim is no longer current.' using errcode = '40001';
  end if;
end;
$$;

create or replace function public.request_ticket_confirmation(
  p_order_id uuid,
  p_cooldown_seconds integer default 120
)
returns setof public.ticket_confirmation_outbox
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_outbox public.ticket_confirmation_outbox%rowtype;
begin
  select orders.status into v_status
  from public.orders orders
  where orders.id = p_order_id
  for update;

  if v_status is distinct from 'paid' then
    raise exception 'Confirmation email is available only for paid orders.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.tickets tickets where tickets.order_id = p_order_id) then
    raise exception 'No tickets have been issued for this order.' using errcode = '55000';
  end if;

  select * into v_outbox
  from public.ticket_confirmation_outbox outbox
  where outbox.order_id = p_order_id
  for update;

  if not found then
    raise exception 'Confirmation queue entry is unavailable.' using errcode = '55000';
  end if;

  if v_outbox.status = 'processing' and v_outbox.locked_until > now() then
    raise exception 'A confirmation email is already being processed.' using errcode = '55000';
  end if;

  if v_outbox.last_manual_requested_at is not null
     and v_outbox.last_manual_requested_at > now() - make_interval(secs => least(greatest(p_cooldown_seconds, 30), 3600)) then
    raise exception 'Please wait before requesting another confirmation email.' using errcode = '55P03';
  end if;

  return query
  update public.ticket_confirmation_outbox outbox
  set generation = outbox.generation + 1,
      status = 'processing',
      attempt_count = 1,
      last_attempt_at = now(),
      next_attempt_at = null,
      generation_started_at = now(),
      locked_until = now() + interval '120 seconds',
      last_manual_requested_at = now(),
      last_error = null,
      updated_at = now()
  where outbox.order_id = p_order_id
  returning outbox.*;
end;
$$;

revoke all on function public.claim_ticket_confirmation(uuid, integer) from public, anon, authenticated;
revoke all on function public.finish_ticket_confirmation(uuid, integer, text, text, integer) from public, anon, authenticated;
revoke all on function public.request_ticket_confirmation(uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_ticket_confirmation(uuid, integer) to service_role;
grant execute on function public.finish_ticket_confirmation(uuid, integer, text, text, integer) to service_role;
grant execute on function public.request_ticket_confirmation(uuid, integer) to service_role;
