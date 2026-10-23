import {
  Link,
  Navigate,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const {
    user,
    loading,
    authError,
    isConfigured,
  } = useAuth();

  const location = useLocation();

  if (!isConfigured) {
    return (
      <main className="container page-section">
        <div className="empty-state">
          <h1>Connect Supabase first.</h1>

          <p>
            Add your project URL and publishable key to
            .env.local, then restart the development server.
          </p>

          <Link to="/" className="button button-dark">
            Back to events
          </Link>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="container page-section">
        <div className="empty-state" role="status">
          Checking your session…
        </div>
      </main>
    );
  }

  if (authError) {
    return (
      <main className="container page-section">
        <div className="empty-state">
          <h2>We couldn’t check your session.</h2>

          <p role="alert">{authError}</p>

          <button
            type="button"
            className="button button-dark"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/organizer/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return children;
}