import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/apiClient";
import PageHeader from "../../components/PageHeader";
import "./InstrumentPages.css";

const ROLES = ["Tester", "Reviewer", "Admin"];
const ROLE_NOTES = {
  Tester: "Registers instruments, records readings and submits sessions.",
  Reviewer: "Reviews submitted sessions and approves or returns them.",
  Admin: "Full access, including rulesets and user accounts.",
};
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const EMPTY = { full_name: "", email: "", password: "", designation: "", role: "Reviewer" };

function validate(form) {
  const errors = {};
  if (!form.full_name.trim()) errors.full_name = "Enter the person's full name.";
  if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = "Enter a valid email address.";
  if (form.password.length < 8) errors.password = "Password must be at least 8 characters.";
  else if (form.password.length > 72) errors.password = "Password must be at most 72 characters.";
  if (!ROLES.includes(form.role)) errors.role = "Choose a role.";
  return errors;
}

// FastAPI returns 422 details as a list: [{ loc: ["body", "password"], msg: "..." }]
function fieldErrorsFrom(err) {
  const detail = err?.data?.detail;
  if (!Array.isArray(detail)) return {};
  const out = {};
  for (const item of detail) {
    const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : null;
    if (field && !out[field]) out[field] = item.msg;
  }
  return out;
}

export default function ManageUsers() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [created, setCreated] = useState([]);

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  async function save(event) {
    event.preventDefault();
    setFormError("");
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      const body = {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        ...(form.designation.trim() ? { designation: form.designation.trim() } : {}),
      };
      const user = await api.createUser(body);
      setCreated((current) => [{ ...user, designation: body.designation }, ...current]);
      setForm(EMPTY);
      setShowPassword(false);
    } catch (err) {
      if (err.status === 422) {
        const fromServer = fieldErrorsFrom(err);
        if (Object.keys(fromServer).length) {
          setErrors(fromServer);
          setFormError("Please correct the highlighted fields.");
        } else {
          setFormError(err.message || "The account details were rejected.");
        }
      } else if (err.status === 409) {
        setErrors({ email: "An account with this email already exists." });
        setFormError("An account with this email already exists.");
      } else if (err.status === 403) {
        setFormError("Only an Admin can create accounts.");
      } else {
        setFormError(err.message || "The account could not be created. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  const field = (id, label, input, note, required = true) => (
    <div className="instrument-field">
      <label htmlFor={id}>{label} {required && <i>*</i>}</label>
      {input}
      {errors[id] ? <span className="instrument-field-error" id={`${id}-error`}>{errors[id]}</span>
        : note && <span className="instrument-field-note">{note}</span>}
    </div>
  );

  return <div className="instrument-page">
    <div className="instrument-breadcrumb"><Link to="/app">Overview</Link><span aria-hidden="true">›</span><span>Manage Users</span></div>
    <PageHeader eyebrow="Administration · Users" title="Manage Users"
      description="Create Tester, Reviewer and Admin accounts. Public sign-up always creates Testers, so reviewer and admin accounts are created here." />

    <form className="instrument-register-layout" onSubmit={save} noValidate>
      <section className="instrument-form-card" aria-labelledby="new-user-title">
        <header className="instrument-card-heading"><h2 id="new-user-title">New Account</h2><span><i aria-hidden="true">*</i> Required</span></header>
        <div className="instrument-form-grid">
          {field("full_name", "Full name",
            <input id="full_name" type="text" autoComplete="off" value={form.full_name} onChange={update("full_name")}
              aria-invalid={Boolean(errors.full_name)} />)}
          {field("email", "Email",
            <input id="email" type="email" autoComplete="off" value={form.email} onChange={update("email")}
              aria-invalid={Boolean(errors.email)} />)}
          {field("password", "Password",
            <div style={{ display: "flex", gap: 8 }}>
              <input id="password" style={{ flex: 1, minWidth: 0 }} type={showPassword ? "text" : "password"} autoComplete="new-password"
                value={form.password} onChange={update("password")} aria-invalid={Boolean(errors.password)} />
              <button className="instrument-button instrument-button--secondary instrument-button--small" type="button"
                onClick={() => setShowPassword((v) => !v)}>{showPassword ? "Hide" : "Show"}</button>
            </div>,
            "At least 8 characters. Share it with the person securely; they can use it to sign in right away.")}
          {field("designation", "Designation",
            <input id="designation" type="text" autoComplete="off" value={form.designation} onChange={update("designation")}
              placeholder="e.g. Senior Reviewing Officer" />,
            "Optional. Printed on approved reports.", false)}
          {field("role", "Role",
            <select id="role" value={form.role} onChange={update("role")} aria-invalid={Boolean(errors.role)}>
              {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>,
            ROLE_NOTES[form.role])}
        </div>
        {formError && <div className="instrument-form-error" role="alert"><strong>{formError}</strong></div>}
        <div className="instrument-form-actions">
          <button className="instrument-button instrument-button--secondary" type="button" disabled={saving}
            onClick={() => { setForm(EMPTY); setErrors({}); setFormError(""); }}>Clear</button>
          <button className="instrument-button instrument-button--primary" type="submit" disabled={saving}>
            {saving ? "Creating…" : "Create account"}
          </button>
        </div>
      </section>
    </form>

    {created.length > 0 && <section className="instrument-form-card" aria-labelledby="created-users-title" style={{ marginTop: 20 }}>
      <header className="instrument-card-heading"><h2 id="created-users-title">Accounts created</h2><span>This session</span></header>
      <div className="instrument-table-scroll">
        <table className="instrument-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Designation</th></tr></thead>
          <tbody>{created.map((u) => <tr key={u.user_id}>
            <td>{u.full_name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.designation || "—"}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>}
  </div>;
}