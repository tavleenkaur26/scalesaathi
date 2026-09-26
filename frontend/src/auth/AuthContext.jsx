import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/apiClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let current = true;
    const handleUnauthorized = () => setUser(null);
    window.addEventListener("ss:unauthorized", handleUnauthorized);
    if (!api.getToken()) {
      setLoading(false);
      return () => { current = false; window.removeEventListener("ss:unauthorized", handleUnauthorized); };
    }
    api.me()
      .then((profile) => { if (current) setUser(profile); })
      .catch(() => { api.logout(); if (current) setUser(null); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; window.removeEventListener("ss:unauthorized", handleUnauthorized); };
  }, []);

  const acceptSession = useCallback((session) => {
    api.setToken(session.access_token);
    setUser({
      user_id: session.user_id,
      full_name: session.full_name,
      role: session.role,
      email: session.email,
    });
  }, []);

  const signIn = useCallback(async (email, password, expectedRole) => {
    const session = await api.login(email, password);
    if (expectedRole && session.role !== expectedRole) {
      const error = new Error(`These credentials belong to a ${session.role} account. Select ${session.role} and try again.`);
      error.code = "ROLE_MISMATCH";
      throw error;
    }
    acceptSession(session);
    return session;
  }, [acceptSession]);

  const register = useCallback(async (details) => {
    const session = await api.register(details);
    acceptSession(session);
    return session;
  }, [acceptSession]);

  const signOut = useCallback(() => {
    api.logout();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, signIn, register, signOut }), [user, loading, signIn, register, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
