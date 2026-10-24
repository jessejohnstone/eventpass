import { useEffect, useState } from "react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  ArrowLeft,
  ArrowUpRight,
  Eye,
  EyeOff,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

// Accept Kenyan mobile numbers entered as:
// 0712345678, 0112345678, 254712345678, or +254712345678.
function normalizeKenyanPhone(value) {
  const cleaned = value.replace(/[\s()-]/g, "");

  if (/^0[17]\d{8}$/.test(cleaned)) {
    return `+254${cleaned.slice(1)}`;
  }

  if (/^254[17]\d{8}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  if (/^\+254[17]\d{8}$/.test(cleaned)) {
    return cleaned;
  }

  return null;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    user,
    loading,
    authError,
    isConfigured,
  } = useAuth();

  const [isSignup, setIsSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const requestedPath = location.state?.from;

  const destination =
    typeof requestedPath === "string" &&
    (
      requestedPath === "/organizer" ||
      requestedPath.startsWith("/organizer/")
    ) &&
    requestedPath !== "/organizer/login"
      ? requestedPath
      : "/organizer";

  useEffect(() => {
    if (!loading && user) {
      navigate(destination, { replace: true });
    }
  }, [user, loading, navigate, destination]);

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.hash.slice(1)
    );

    const confirmationError =
      params.get("error_description");

    if (confirmationError) {
      setError(confirmationError);
    }
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
    setMessage("");
  }

  function changeMode() {
    setIsSignup((current) => !current);

    setError("");
    setMessage("");

    setForm((current) => ({
      ...current,
      password: "",
      confirmPassword: "",
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!supabase) {
      setError(
        "Supabase is not configured. Check .env.local and restart npm run dev."
      );

      return;
    }

    let normalizedPhone = null;

    if (isSignup) {
      if (form.name.trim().length < 2) {
        setError("Enter your full name.");
        return;
      }

      normalizedPhone = normalizeKenyanPhone(form.phone);

      if (!normalizedPhone) {
        setError(
          "Enter a valid Kenyan mobile number, such as 0712345678 or +254712345678."
        );

        return;
      }

      if (form.password !== form.confirmPassword) {
        setError("Your passwords do not match.");
        return;
      }
    }

    setBusy(true);

    try {
      const email = form.email.trim().toLowerCase();

      if (isSignup) {
        const { data, error: signupError } =
          await supabase.auth.signUp({
            email,
            password: form.password,

            options: {
              data: {
                full_name: form.name.trim(),
                phone_number: normalizedPhone,
              },

              emailRedirectTo:
                window.location.origin +
                "/organizer/login",
            },
          });

        if (signupError) throw signupError;

        setForm((current) => ({
          ...current,
          password: "",
          confirmPassword: "",
        }));

        if (data.session) {
          navigate(destination, { replace: true });
        } else {
          setMessage(
            "Check your inbox for an account confirmation email. Confirm your email, then sign in. If you already have an account, use Sign in."
          );
        }
      } else {
        const { error: loginError } =
          await supabase.auth.signInWithPassword({
            email,
            password: form.password,
          });

        if (loginError) throw loginError;

        navigate(destination, { replace: true });
      }
    } catch (submitError) {
      setError(
        submitError.message ||
          "We couldn’t complete the request. Please try again."
      );
    } finally {
      setBusy(false);
    }
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

  return (
    <main className="container auth-layout">
      <section className="auth-introduction">
        <span className="eyebrow">
          FOR THE MOMENT MAKERS
        </span>

        <h1>
          Bring people
          <br />
          <em>together.</em>
        </h1>

        <p>
          Create experiences, welcome your community,
          and make every moment count.
        </p>

        <Link to="/" className="back-link">
          <ArrowLeft size={17} />
          Explore events first
        </Link>
      </section>

      <section className="auth-panel">
        <h2>
          {isSignup
            ? "Make it happen."
            : "Welcome back."}
        </h2>

        <p className="auth-subtitle">
          {isSignup
            ? "Create your organizer account."
            : "Sign in to your organizer workspace."}
        </p>

        {!isConfigured && (
          <div className="auth-error" role="alert">
            Supabase is not configured. Add your project
            URL and publishable key to .env.local,
            then restart the development server.
          </div>
        )}

        {authError && (
          <div className="auth-error" role="alert">
            {authError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isSignup && (
            <>
              <label className="form-field">
                Full name

                <input
                  type="text"
                  name="name"
                  autoComplete="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Johnstone Oroni"
                  minLength={2}
                  maxLength={100}
                  disabled={busy}
                  required
                />
              </label>

              <label className="form-field">
                Phone number

                <input
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="0712345678"
                  maxLength={25}
                  aria-describedby="phone-help"
                  disabled={busy}
                  required
                />

                <small id="phone-help">
                  Kenyan mobile number, for example
                  0712345678 or +254712345678.
                </small>
              </label>
            </>
          )}

          <label className="form-field">
            Email address

            <input
              type="email"
              name="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              maxLength={254}
              disabled={busy}
              required
            />
          </label>

          <label className="form-field">
            Password

            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete={
                  isSignup
                    ? "new-password"
                    : "current-password"
                }
                value={form.password}
                onChange={handleChange}
                placeholder={
                  isSignup
                    ? "Create a strong password"
                    : "Enter your password"
                }
                minLength={isSignup ? 8 : undefined}
                maxLength={128}
                disabled={busy}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword((current) => !current)
                }
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </label>

          {isSignup && (
            <label className="form-field">
              Confirm password

              <input
                type={showPassword ? "text" : "password"}
                name="confirmPassword"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Enter your password again"
                minLength={8}
                maxLength={128}
                disabled={busy}
                required
              />
            </label>
          )}

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          {message && (
            <div
              className="information-message"
              role="status"
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            className="button button-dark full-width"
            disabled={busy || !isConfigured}
          >
            {busy
              ? "Please wait…"
              : isSignup
                ? "Create organizer account"
                : "Sign in"}

            {!busy && <ArrowUpRight size={18} />}
          </button>
        </form>

        <p className="auth-switch">
          {isSignup
            ? "Already have an account?"
            : "New to EventPass?"}

          <button
            type="button"
            onClick={changeMode}
            disabled={busy}
          >
            {isSignup ? "Sign in" : "Create an account"}
          </button>
        </p>
      </section>
    </main>
  );
}