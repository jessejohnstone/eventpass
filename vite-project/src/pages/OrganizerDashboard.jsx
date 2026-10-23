import { useState } from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  ArrowUpRight,
  LogOut,
  ShieldCheck,
  Ticket,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

export default function OrganizerDashboard() {
  const { user } = useAuth();

  const navigate = useNavigate();

  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");

  const organizerName =
    user?.user_metadata?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    "Organizer";

  async function handleLogout() {
    if (!supabase) return;

    setSigningOut(true);
    setError("");

    try {
      const { error: signOutError } =
        await supabase.auth.signOut({
          scope: "local",
        });

      if (signOutError) throw signOutError;

      navigate("/organizer/login", {
        replace: true,
      });
    } catch (logoutError) {
      setError(
        logoutError.message ||
          "Could not sign out. Please try again."
      );
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <main className="container page-section">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">
            YOUR ORGANIZER WORKSPACE
          </span>

          <h1>Welcome, {organizerName}.</h1>

          <p>
            Your next great event starts here.
          </p>
        </div>

        <button
          type="button"
          className="button button-dark"
          onClick={handleLogout}
          disabled={signingOut}
        >
          <LogOut size={17} />

          {signingOut
            ? "Signing out…"
            : "Sign out"}
        </button>
      </div>

      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}

      <div className="organizer-account-grid">
        <section className="organizer-account-card">
          <span className="account-card-icon">
            <ShieldCheck size={24} />
          </span>

          <h2>Your account</h2>

          <dl className="account-details">
            <div>
              <dt>Name</dt>
              <dd>{organizerName}</dd>
            </div>

            <div>
              <dt>Email</dt>
              <dd>{user?.email}</dd>
            </div>

            <div>
              <dt>Email confirmation</dt>

              <dd>
                {user?.email_confirmed_at
                  ? "Confirmed"
                  : "Not confirmed"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="organizer-account-card">
          <span className="account-card-icon">
            <Ticket size={24} />
          </span>

          <h2>Your events</h2>

          <p>
            Your account is connected. Event creation
            and management will be added when we
            connect the event database.
          </p>

          <Link
            to="/"
            className="button button-dark"
          >
            Browse events
            <ArrowUpRight size={17} />
          </Link>
        </section>
      </div>
    </main>
  );
}