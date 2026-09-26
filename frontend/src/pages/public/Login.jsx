import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { api } from "../../api/apiClient";
import { useAuth } from "../../auth/AuthContext";
import logo from "../../assets/hero/logo.png";
import scale from "../../assets/hero/scale.png";
import botanical from "../../assets/hero/botanical-right.png";
import "./AuthPages.css";

const roles = ["Tester", "Reviewer", "Admin"];

function AuthBrand() {
  return <Link className="auth-brand" to="/" aria-label="ScaleSaathi home">
    <img src={logo} alt="" />
    <span><strong>ScaleSaathi</strong><small>Measure. Verify. Trust.</small></span>
  </Link>;
}

function AuthArtwork({ register = false }) {
  return <aside className={`auth-artwork ${register ? "auth-artwork--register" : ""}`} aria-label="Precision weighing instruments">
    <div className="auth-artwork__wash" />
    <img className="auth-artwork__botanical" src={botanical} alt="" />
    <img className="auth-artwork__scale" src={scale} alt="A precision balance used for instrument verification" />
    <div className="auth-artwork__caption"><span>Precision builds trust</span><p>Accurate<br />measurements.<br />Safer markets.</p></div>
  </aside>;
}

function friendlyError(error) {
  if (error.code === "ROLE_MISMATCH") return error.message;
  if (error.status === 401) return "The email or password you entered is incorrect. Please try again.";
  if (error.status === 403) return "This account cannot sign in right now. Contact your lab administrator.";
  if (!error.status || error.status >= 500) return "We couldn’t reach the ScaleSaathi service. Check your connection and try again.";
  return error.message || "Something went wrong. Please review your details and try again.";
}

export default function Login() {
  const { signIn, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [demoUsers, setDemoUsers] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { api.demoUsers().then(setDemoUsers).catch(() => setDemoUsers([])); }, []);

  if (authLoading) return <main className="auth-checking"><span className="auth-spinner" />Checking your session…</main>;
  if (user) return <Navigate to="/app" replace />;

  const selectedDemo = demoUsers.find((item) => item.role === role);
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signIn(email.trim(), password, role);
      navigate(location.state?.from?.pathname || "/app", { replace: true });
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setSubmitting(false);
    }
  };

  return <main className="auth-page">
    <section className="auth-panel" aria-labelledby="login-title">
      <AuthBrand />
      <div className="auth-form-wrap">
        <p className="auth-eyebrow">Your verification workspace</p>
        <h1 id="login-title">Welcome back.</h1>
        <p className="auth-intro">Sign in to continue your lab’s work.</p>
        <form className="auth-form" onSubmit={submit}>
          <label className="auth-field"><span>Email address</span><input autoComplete="username" type="email" name="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" required /></label>
          <label className="auth-field"><span>Password</span><input autoComplete="current-password" type="password" name="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required /></label>
          <label className="auth-field"><span>Select your role</span><select name="role" value={role} onChange={(event) => setRole(event.target.value)} required><option value="" disabled>Choose a role</option>{roles.map((item) => <option key={item}>{item}</option>)}</select></label>

          {selectedDemo && <button className="demo-fill" type="button" onClick={() => { setEmail(selectedDemo.email); setPassword(selectedDemo.password); setError(""); }}>Use {role.toLowerCase()} demo account</button>}
          {error && <p className="auth-message auth-message--error" role="alert">{error}</p>}
          <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? <><span className="auth-spinner auth-spinner--light" />Signing in…</> : "Sign in"}</button>
        </form>
        <p className="auth-switch">New to ScaleSaathi? <Link to="/register">Create an account</Link></p>
      </div>
    </section>
    <AuthArtwork />
  </main>;
}
