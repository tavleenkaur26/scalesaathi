import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

function CheckingSession() {
  return <main className="auth-checking" aria-live="polite"><span className="auth-spinner" />Checking your session…</main>;
}

export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <CheckingSession />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

export function RequireRole({ roles, children }) {
  const { user } = useAuth();
  if (!roles.includes(user?.role)) {
    return <main className="access-denied"><p className="auth-eyebrow">Access</p><h1>This page is not available for your role.</h1><Link to="/app">Return to overview</Link></main>;
  }
  return children;
}
