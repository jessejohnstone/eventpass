function unwrap(result) {
  if (result.error) {
    const error = new Error(result.error.message);
    error.code = result.error.code;
    error.status = result.error.code === "55P03"
      ? 429
      : result.error.code === "42501"
        ? 403
        : result.error.code === "55000"
          ? 409
          : 500;
    throw error;
  }
  return result.data;
}

function firstRow(data) {
  return Array.isArray(data) ? data[0] || null : data || null;
}

export function createTicketEmailStore(supabase) {
  return {
    async claim(orderId) {
      const data = unwrap(await supabase.rpc("claim_ticket_confirmation", {
        p_order_id: orderId,
        p_lease_seconds: 120,
      }));
      return firstRow(data);
    },

    async loadPaidOrder(orderId) {
      const order = unwrap(await supabase
        .from("orders")
        .select("id, event_id, buyer_name, buyer_email, reference, access_token, status, payment_domain")
        .eq("id", orderId)
        .maybeSingle());

      if (!order || order.status !== "paid") {
        throw new Error("Paid order tickets are not available yet.");
      }

      const [event, tickets] = await Promise.all([
        supabase
          .from("events")
          .select("title, venue, starts_at, ends_at")
          .eq("id", order.event_id)
          .single(),
        supabase
          .from("tickets")
          .select("reference, token, ticket_type_name")
          .eq("order_id", order.id)
          .order("reference", { ascending: true }),
      ]);

      const eventData = unwrap(event);
      const ticketData = unwrap(tickets);
      if (!ticketData?.length) {
        throw new Error("Paid order tickets are not available yet.");
      }

      return { order, event: eventData, tickets: ticketData };
    },

    async finish({ orderId, generation, providerId, error, retryAfterSeconds }) {
      unwrap(await supabase.rpc("finish_ticket_confirmation", {
        p_order_id: orderId,
        p_generation: generation,
        p_provider_id: providerId,
        p_error: error,
        p_retry_after_seconds: retryAfterSeconds,
      }));
    },

    async requestManual(orderId) {
      const data = unwrap(await supabase.rpc("request_ticket_confirmation", {
        p_order_id: orderId,
        p_cooldown_seconds: 120,
      }));
      return firstRow(data);
    },
  };
}
