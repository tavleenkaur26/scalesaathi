import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import logo from "../../assets/hero/logo.png";
import scale from "../../assets/hero/scale.png";
import botanical from "../../assets/hero/botanical-right.png";
import "./AuthPages.css";

function AuthBrand() {
  return <Link className="auth-brand" to="/" aria-label="ScaleSaathi home">
    <img src={logo} alt="" />
    <span><strong>ScaleSaathi</strong><small>Measure. Verify. Trust.</small></span>
  </Link>;
}

export default function Register() {
  const { register, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirm_password: "", role: "Tester" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (authLoading) return <main className="auth-checking"><span className="auth-spinner" />Checking your session…</main>;
  if (user) return <Navigate to="/app" replace />;

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (form.password !== form.confirm_password) {
      setError("The passwords do not match. Please check both fields.");
      return;
    }
    setSubmitting(true);
    try {
      await register({ full_name: form.full_name.trim(), email: form.email.trim(), password: form.password });
      navigate("/app", { replace: true });
    } catch (cause) {
      if (cause.status === 409) setError("An account with this email already exists. Try signing in instead.");
      else if (cause.status === 422) setError("Please check your details. Passwords must be at least 8 characters and email must be valid.");
      else if (!cause.status || cause.status >= 500) setError("We couldn’t reach the ScaleSaathi service. Check your connection and try again.");
      else setError(cause.message || "We couldn’t create your account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return <main className="auth-page auth-page--register">
    <section className="auth-panel" aria-labelledby="register-title">
      <AuthBrand />
      <div className="auth-form-wrap">
        <p className="auth-eyebrow">A trusted start for better measurements</p>
        <h1 id="register-title">Create your account.</h1>
        <p className="auth-intro">Set up your ScaleSaathi workspace access.</p>
        <form className="auth-form" onSubmit={submit}>
          <label className="auth-field"><span>Full name</span><input autoComplete="name" name="full_name" value={form.full_name} onChange={update} placeholder="Your full name" required /></label>
          <label className="auth-field"><span>Email address</span><input autoComplete="email" type="email" name="email" value={form.email} onChange={update} placeholder="you@company.com" required /></label>
          <label className="auth-field"><span>Password</span><input autoComplete="new-password" type="password" name="password" minLength={8} maxLength={72} value={form.password} onChange={update} placeholder="At least 8 characters" required /></label>
          <label className="auth-field"><span>Confirm password</span><input autoComplete="new-password" type="password" name="confirm_password" minLength={8} maxLength={72} value={form.confirm_password} onChange={update} placeholder="Enter your password again" required /></label>
          <label className="auth-field"><span>Select your role</span><select name="role" value={form.role} onChange={update} aria-describedby="register-role-note" required><option value="Tester">Tester</option><option value="Reviewer" disabled>Reviewer</option><option value="Admin" disabled>Admin</option></select></label>
          <p className="auth-field-note" id="register-role-note">Public registration creates Tester accounts. Reviewer and Admin access is assigned by a lab administrator.</p>
          {error && <p className="auth-message auth-message--error" role="alert">{error}</p>}
          <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? <><span className="auth-spinner auth-spinner--light" />Creating account…</> : "Create account"}</button>
        </form>
        <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </section>
    <aside className="auth-artwork auth-artwork--register" aria-label="Precision weighing instruments">
      <div className="auth-artwork__wash" /><img className="auth-artwork__botanical" src={botanical} alt="" /><img className="auth-artwork__scale" src={scale} alt="A precision balance used for instrument verification" />
      <div className="auth-artwork__caption"><span>Precision builds trust</span><p>Accurate<br />measurements.<br />Safer markets.</p></div>
    </aside>
  </main>;
}
