import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/apiClient";
import "./TestWorkflow.css";

export default function SessionsList() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api.listSessions().then((data) => { if (active) setSessions(data); })
      .catch((e) => { if (active) setError(e.message || "Sessions could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return <div className="workflow-page">
    <header className="workflow-session-heading"><div><p className="instrument-eyebrow">Testing</p><h1>Test Sessions</h1><p>Review saved drafts and completed evaluations.</p></div><Link className="instrument-button instrument-button--primary" to="/app/sessions/new">Start a Session <span aria-hidden="true">→</span></Link></header>
    {error && <div className="workflow-error" role="alert">{error}</div>}
    {loading && <div className="instrument-state" role="status"><span className="instrument-spinner"/>Loading sessions…</div>}
    {!loading && !error && sessions.length === 0 && <section className="workflow-card workflow-session-empty"><h2>No test sessions yet</h2><p>Choose a registered instrument to view its ruleset generated test plan and start a session.</p><Link className="instrument-button instrument-button--primary" to="/app/sessions/new">Choose Instrument</Link></section>}
    {!loading && sessions.length > 0 && <section className="workflow-card workflow-session-list"><div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Session</th><th>Instrument</th><th>Tested</th><th>Status</th><th>Evaluation</th><th>Action</th></tr></thead><tbody>{sessions.map((s) => <tr key={s.id}><td>{s.id}</td><td>{s.manufacturer} · {s.model} <small>{s.serial_no}</small></td><td>{s.tested_at ? new Date(s.tested_at).toLocaleDateString() : "—"}</td><td><span className="workflow-draft-badge">{s.status}</span></td><td>{s.verdict || "—"}</td><td>{s.verdict ? <Link className="instrument-row-action" to={"/app/sessions/" + s.id + "/results"}>Results</Link> : <Link className="instrument-row-action" to={"/app/sessions/" + s.id}>Resume</Link>}</td></tr>)}</tbody></table></div></section>}
  </div>;
}
