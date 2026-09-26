import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api/apiClient";
import "./TestWorkflow.css";

export default function SessionNew() {
  const navigate = useNavigate();
  const [instruments, setInstruments] = useState([]);
  const [instrumentId, setInstrumentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api.listInstruments().then((data) => { if (active) { setInstruments(data); if (data.length) setInstrumentId(String(data[0].id)); } })
      .catch((e) => { if (active) setError(e.message || "Registered instruments could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return <div className="workflow-page">
    <div className="instrument-breadcrumb"><Link to="/app/sessions">Test Sessions</Link><span aria-hidden="true">›</span><span>New</span></div>
    <header className="workflow-session-heading"><div><p className="instrument-eyebrow">Testing · New Session</p><h1>Choose an Instrument</h1><p>Select a registered instrument to open its current ruleset generated test plan.</p></div></header>
    {error && <div className="workflow-error" role="alert">{error}</div>}
    {loading && <div className="instrument-state" role="status"><span className="instrument-spinner"/>Loading registered instruments…</div>}
    {!loading && !error && instruments.length === 0 && <section className="workflow-card"><h2>No registered instruments</h2><p>Register an instrument before creating a test session.</p><Link className="instrument-button instrument-button--primary" to="/app/instruments/new">Register Instrument</Link></section>}
    {!loading && !error && instruments.length > 0 && <section className="workflow-card workflow-new-session"><div className="instrument-field"><label htmlFor="session-instrument">Registered instrument</label><select id="session-instrument" value={instrumentId} onChange={(e) => setInstrumentId(e.target.value)}>{instruments.map((item) => <option key={item.id} value={item.id}>{item.manufacturer} · {item.model} · {item.serial_no}</option>)}</select></div><div className="workflow-new-session__details">{(() => { const item = instruments.find((x) => String(x.id) === instrumentId); return item ? <><span>Max {Number(item.max_capacity).toLocaleString()} g</span><span>Min {Number(item.min_capacity).toLocaleString()} g</span><span>e {item.e} g</span><span>Class {item.accuracy_class}</span></> : null; })()}</div><div className="workflow-actions"><Link className="instrument-button instrument-button--secondary" to="/app/sessions">Cancel</Link><button className="instrument-button instrument-button--primary" type="button" disabled={!instrumentId} onClick={() => navigate("/app/instruments/" + instrumentId + "/test-plan")}>View Test Plan <span aria-hidden="true">→</span></button></div></section>}
  </div>;
}
