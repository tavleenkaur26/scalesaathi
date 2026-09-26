import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/apiClient";
import PageHeader from "../../components/PageHeader";
import scale from "../../assets/hero/scale2.png";
import "./TestWorkflow.css";

const labels = { weighing: "Weighing", eccentricity: "Eccentricity", repeatability: "Repeatability", discrimination: "Discrimination", zero_setting: "Zero-setting", tare_setting: "Tare", temperature: "Temperature", disturbances: "Disturbances", disturbance: "Disturbances" };
const mass = (n) => n == null ? "—" : Number(n).toLocaleString(undefined, { maximumFractionDigits: 4 }) + " g";
const noteText = (value) => Array.isArray(value) ? value.join("; ") : value || "";
function rowsForPlan(plan) {
  const rows = [];
  for (const [key, value] of Object.entries(plan || {})) {
    const test = labels[key] || key.replaceAll("_", " ").replace(/\b\w/g, (x) => x.toUpperCase());
    if (key === "ruleset_version") continue;
    if (key === "weighing" && Array.isArray(value.points)) value.points.forEach((p, i) => rows.push({ id: key + "-" + i, test, load: mass(p.load), mpe: mass(p.mpe), type: p.type || "—", notes: p.reason || "", boundary: p.boundary === true }));
    else if (key === "eccentricity") (value.positions || [""]).forEach((position, i) => rows.push({ id: key + "-" + i, test, load: mass(value.load), mpe: mass(value.mpe), type: "Position", notes: position }));
    else if (key === "repeatability") (value.series || []).forEach((s, i) => rows.push({ id: key + "-" + i, test, load: mass(s.load), mpe: mass(s.mpe), type: s.type || "—", notes: (s.weighings ?? "—") + " repeated readings" }));
    else if (key === "discrimination") (value.points || []).forEach((p, i) => rows.push({ id: key + "-" + i, test, load: mass(p.load), mpe: mass(p.mpe), type: p.type || "—", notes: p.extra_load == null ? "" : "Additional load " + mass(p.extra_load) }));
    else if (key === "zero_setting" || key === "tare_setting") rows.push({ id: key, test, load: "—", mpe: mass(value.limit), type: "—", notes: noteText(value.notes || value.note || value.clause) });
    else if (key === "temperature") (value.sequence_c || []).forEach((temperature, i) => rows.push({ id: key + "-" + i, test, load: temperature + " °C", mpe: "—", type: "—", notes: value.clause || "" }));
    else if (key === "disturbance" || key === "disturbances") {
      const entries = Array.isArray(value) ? value : value.items || value.points || value.disturbances || (value.name ? [value] : []);
      entries.forEach((entry, i) => rows.push({ id: key + "-" + i, test, load: entry.load == null ? "—" : mass(entry.load), mpe: entry.mpe == null ? "—" : mass(entry.mpe), type: entry.type || "—", notes: entry.name || entry.note || entry.clause || "" }));
    } else rows.push({ id: key, test, load: value.load == null ? "—" : mass(value.load), mpe: value.limit == null ? "—" : mass(value.limit), type: value.type || "—", notes: value.note || value.clause || "" });
  }
  return rows;
}
export default function TestPlan() {
  const { instrumentId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [instrument, setInstrument] = useState(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  useEffect(() => {
    let live = true;
    Promise.all([api.getTestPlan(instrumentId), api.getInstrument(instrumentId)])
      .then(([plan, item]) => { if (live) { setData(plan); setInstrument(item); } })
      .catch((e) => { if (live) setError(e.message || "The test plan could not be loaded."); });
    return () => { live = false; };
  }, [instrumentId]);
  const planRows = data ? rowsForPlan(data) : [];
  async function start() {
    setStarting(true); setError("");
    try { const session = await api.createSession({ instrument_id: Number(instrumentId) }); navigate("/app/sessions/" + session.id); }
    catch (e) { setError(e.message || "Could not start the test session."); setStarting(false); }
  }
  return <div className="workflow-page">
    <div className="instrument-breadcrumb"><Link to={"/app/instruments/" + instrumentId}>Instrument Details</Link><span aria-hidden="true">›</span><span>Test Plan</span></div>
    {error && <div className="workflow-error" role="alert">{error}</div>}
    <PageHeader eyebrow="Instruments · Test Plan" title="Auto-Generated Test Plan" description="The active ruleset generated these measurements from the instrument specifications." actions={<Link className="instrument-button instrument-button--secondary" to={"/app/instruments/" + instrumentId}>Back</Link>} />
    {!data && !error && <div className="instrument-state" role="status"><span className="instrument-spinner"/>Generating plan from active ruleset…</div>}
    {data && <>
      <section className="workflow-instrument">
        <img src={scale} alt="Precision weighing instrument" />
        <div><p className="instrument-eyebrow">{instrument?.manufacturer || "Instrument"}</p><h2>{instrument?.model} {instrument?.serial_no ? "· S. No. " + instrument.serial_no : ""}</h2><p>Max {mass(instrument?.max_capacity)} · Min {mass(instrument?.min_capacity)} · e {mass(instrument?.e)} · Class {instrument?.accuracy_class}</p></div>
        <span className="workflow-ruleset">Ruleset {data.ruleset_version || "—"}</span>
      </section>
      <section className="workflow-card workflow-plan-table-card" aria-label="Generated test plan">
        <h2>Test Plan</h2><p>Measurement points and criteria come from the active backend ruleset.</p>
        <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Test</th><th>Load</th><th>MPE / limit</th><th>Type</th><th>Notes</th></tr></thead><tbody>{planRows.map((row) => <tr key={row.id}><td>{row.test}</td><td>{row.load}</td><td>{row.mpe}</td><td>{row.type}</td><td>{row.boundary && <span className="workflow-boundary">Boundary</span>}{row.notes && <span>{row.boundary ? " " : ""}{row.notes}</span>}</td></tr>)}</tbody></table></div>
      </section>
      <div className="workflow-actions"><Link className="instrument-button instrument-button--secondary" to={"/app/instruments/" + instrumentId}>Back to Instrument</Link><button className="instrument-button instrument-button--primary" type="button" disabled={starting} onClick={start}>{starting ? "Starting…" : "Start Test"}<span aria-hidden="true"> →</span></button></div>
    </>}
  </div>;
}
