import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  supabase,
  isSupabaseConfigured,
} from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);

  const [loading, setLoading] = useState(
    isSupabaseConfigured
  );

  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;
    let authEventReceived = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!active) return;

        authEventReceived = true;

        setSession(nextSession);
        setAuthError("");
        setLoading(false);
      }
    );

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active || authEventReceived) return;

        if (error) {
          setAuthError(error.message);
          setSession(null);
        } else {
          setSession(data.session);
        }

        setLoading(false);
      })
      .catch(() => {
        if (!active || authEventReceived) return;

        setAuthError(
          "Could not load your session. Check your connection and refresh."
        );

        setLoading(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    authError,
    isConfigured: isSupabaseConfigured,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider."
    );
  }

  return context;
}