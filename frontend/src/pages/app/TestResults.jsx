import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { api } from "../../api/apiClient";
import "./TestWorkflow.css";

export const mass = (value) => value == null || !Number.isFinite(Number(value)) ? "—" : `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 5 })} g`;
export const pct = (value) => value == null || !Number.isFinite(Number(value)) ? "—" : `${(Number(value) * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
export const outcome = (value) => value || "Not reported";
export const testName = (value) => String(value || "Test").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const outcomeClass = (value) => String(value || "unknown").toLowerCase().replace(/[^a-z-]/g, "");

export function Outcome({ value }) {
  return <span className={`workflow-outcome workflow-outcome--${outcomeClass(value)}`}>{outcome(value)}</span>;
}

export function ChangeoverChart({ rows }) {
  const points = rows.map((row) => ({ load: Number(row.load), error: Number(row.error), naive: row.naive_error == null ? null : Number(row.naive_error), mpe: Math.abs(Number(row.mpe)) }));
  const width = 430, height = 178, left = 46, right = 12, top = 12, bottom = 32;
  const minLoad = Math.min(...points.map((point) => point.load));
  const maxLoad = Math.max(...points.map((point) => point.load));
  const minError = Math.min(0, ...points.map((point) => Math.min(point.error, -point.mpe, point.naive ?? point.error)));
  const maxError = Math.max(0, ...points.map((point) => Math.max(point.error, point.mpe, point.naive ?? point.error)));
  const range = maxError - minError || 1;
  const low = minError - range * .12, high = maxError + range * .12;
  const x = (load) => left + (maxLoad === minLoad ? .5 : (load - minLoad) / (maxLoad - minLoad)) * (width - left - right);
  const y = (error) => top + (high - error) / (high - low) * (height - top - bottom);
  const r76Line = points.map((point) => `${x(point.load)},${y(point.error)}`).join(" ");
  const naivePoints = points.filter((point) => point.naive != null);
  const naiveLine = naivePoints.map((point) => `${x(point.load)},${y(point.naive)}`).join(" ");
  const upper = points.map((point) => `${x(point.load)},${y(point.mpe)}`).join(" ");
  const lower = points.map((point) => `${x(point.load)},${y(-point.mpe)}`).join(" ");
  const ticks = [high - (high - low) * .12, (high + low) / 2, low + (high - low) * .12];
  return <div className="workflow-changeover-chart"><div className="workflow-chart-legend"><span><i className="is-r76"/>R76 error</span>{naivePoints.length > 1 && <span><i className="is-naive"/>Naive error</span>}<span><i className="is-limit"/>± MPE</span></div><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Backend weighing readings: R76 error and naive error against load, with returned MPE limits for ${points.length} points`}>
    {ticks.map((tick, index) => <g key={index}><line x1={left} x2={width-right} y1={y(tick)} y2={y(tick)} className="workflow-chart-grid"/><text x={left-7} y={y(tick)+3} textAnchor="end" className="workflow-chart-axis-label">{Number(tick).toFixed(1)}</text></g>)}
    <line x1={left} x2={width-right} y1={y(0)} y2={y(0)} className="workflow-chart-zero"/><polyline points={upper} className="workflow-chart-limit"/><polyline points={lower} className="workflow-chart-limit"/>
    {naivePoints.length > 1 && <polyline points={naiveLine} className="workflow-chart-naive"/>}<polyline points={r76Line} className="workflow-chart-r76"/>
    {points.map((point,index)=><circle key={`r-${index}`} cx={x(point.load)} cy={y(point.error)} r="3" className="workflow-chart-dot"/>)}
    {naivePoints.map((point,index)=><circle key={`n-${index}`} cx={x(point.load)} cy={y(point.naive)} r="2.2" className="workflow-chart-dot workflow-chart-dot--naive"/>)}
    <line x1={left} x2={width-right} y1={height-bottom} y2={height-bottom} className="workflow-chart-axis"/><text x={(left+width-right)/2} y={height-8} textAnchor="middle" className="workflow-chart-axis-label">Load (g)</text><text x="12" y={(top+height-bottom)/2} textAnchor="middle" transform={`rotate(-90 12 ${(top+height-bottom)/2})`} className="workflow-chart-axis-label">Error (g)</text>
  </svg><p>Plotted values and permissible-error limits are taken from the evaluation response.</p></div>;
}

export default function TestResults() {
  const { sessionId } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const [session, setSession] = useState(null);
  const [verdict, setVerdict] = useState(location.state?.verdict || null);
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    let active = true;
    api.getSession(sessionId).then((data) => {
      if (!active) return;
      setSession(data);
      const savedVerdict = location.state?.verdict || data.verdict_detail || null;
      setVerdict(savedVerdict);
      setSelectedIndex(0);
    }).catch((e) => { if (active) setError(e.message || "The evaluation could not be loaded."); });
    return () => { active = false; };
  }, [sessionId, location.state]);

  const results = verdict?.results || [];
  const selected = results[selectedIndex] || null;
  const canCompare = selected?.error != null && selected?.naive_error != null && selected?.naive_result != null && selected?.result != null;
  const chartRows = results.filter((row) => row.test === "weighing" && row.load != null && row.error != null && row.mpe != null).filter((row, index, rows) => Number.isFinite(Number(row.load)) && Number.isFinite(Number(row.error)) && Number.isFinite(Number(row.mpe)) && (index === 0 || Number(row.load) !== Number(rows[index - 1].load)));
  const inst = session?.instrument;
  const canSubmit = ["Tester", "Admin"].includes(user?.role) && ["Draft", "Returned"].includes(session?.status) && verdict && verdict.overall !== "INCOMPLETE";

  async function submitForReview() {
    if (submitting || !canSubmit) return;
    setSubmitting(true); setSubmitError(""); setNotice("");
    try {
      const updated = await api.submit(sessionId);
      setSession((current) => ({ ...current, ...updated }));
      setNotice(`Session ${updated.status || "Submitted"} for review.`);
      setConfirming(false);
    } catch (e) {
      setSubmitError(e.message || "The session could not be submitted. Your evaluation is still available.");
    } finally { setSubmitting(false); }
  }

  if (error) return <div className="workflow-page"><div className="workflow-error" role="alert">{error}</div><Link className="instrument-button instrument-button--secondary" to={`/app/sessions/${sessionId}`}>Back to Test Session</Link></div>;
  if (!session) return <div className="workflow-page"><div className="instrument-state" role="status"><span className="instrument-spinner"/>Loading session…</div></div>;
  if (!verdict) return <div className="workflow-page"><section className="workflow-card workflow-empty-results" role="status"><h2>No evaluation is available yet</h2><p>This session has no saved engine verdict. Return to the test session to review observations and retry evaluation.</p><Link className="instrument-button instrument-button--primary" to={`/app/sessions/${sessionId}`}>Back to Test Session</Link></section></div>;

  return <div className="workflow-page workflow-results-page">
    <div className="instrument-breadcrumb"><Link to="/app/sessions">Test Sessions</Link><span aria-hidden="true">›</span><span>Session {session.id}</span><span aria-hidden="true">›</span><span>Results</span></div>
    <header className="workflow-session-heading workflow-results-heading">
      <div><p className="instrument-eyebrow">Evaluation · {verdict.ruleset_version || session.ruleset_version || "Ruleset unavailable"}</p><h1>Test Results</h1><p>{inst.manufacturer} · {inst.model} · Serial No. {inst.serial_no}</p></div>
      <div className="workflow-results-status"><span className={`workflow-result-badge workflow-result-badge--${outcomeClass(verdict.overall)}`}>{outcome(verdict.overall)}</span><span className="workflow-draft-badge">{session.status}</span></div>
    </header>

    <section className="workflow-result-context" aria-label="Instrument and session details">
      <div><span>Manufacturer</span><strong>{inst.manufacturer || "—"}</strong></div><div><span>Model</span><strong>{inst.model || "—"}</strong></div><div><span>Serial Number</span><strong>{inst.serial_no || "—"}</strong></div><div><span>Accuracy Class</span><strong>{inst.accuracy_class || "—"}</strong></div><div><span>Max</span><strong>{mass(inst.max_capacity)}</strong></div><div><span>Min</span><strong>{mass(inst.min_capacity)}</strong></div><div><span>e</span><strong>{mass(inst.e)}</strong></div><div><span>Session</span><strong>{session.id}</strong></div>
    </section>

    <section className={`workflow-overall workflow-overall--${outcomeClass(verdict.overall)}`} aria-label="Overall result">
      <div className="workflow-overall__mark" aria-hidden="true">{verdict.overall === "PASS" ? "✓" : verdict.overall === "FAIL" ? "!" : "…"}</div>
      <div className="workflow-overall__result"><span>Overall Result</span><strong>{outcome(verdict.overall)}</strong></div>
      <div className="workflow-overall__stat"><span>Test results</span><strong>{results.length}</strong></div>
      <div className="workflow-overall__stat"><span>Failed tests</span><strong>{verdict.failed_tests?.length ?? "—"}</strong></div>
      <div className="workflow-overall__stat"><span>Marginal results</span><strong>{verdict.marginal_results ?? "—"}</strong></div>
      <div className="workflow-overall__stat"><span>Method / Ruleset</span><strong>{verdict.ruleset_version || session.ruleset_version || "—"}</strong></div>
    </section>

    {verdict.warnings?.length > 0 && <section className="workflow-card workflow-result-warnings"><h2>Evaluation notes</h2><ul>{verdict.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul></section>}

    <section className="workflow-card workflow-results-card" aria-labelledby="results-table-title">
      <div className="workflow-section-heading"><div><h2 id="results-table-title">Test-wise results</h2><p>Select a row to see its error, allowed MPE, and engine explanation.</p></div><span>{results.length} evaluated result{results.length === 1 ? "" : "s"}</span></div>
      {results.length ? <div className="workflow-table-wrap"><table className="workflow-table workflow-results-table"><thead><tr><th scope="col">Test</th><th scope="col">Load</th><th scope="col">MPE</th><th scope="col">R76 Error</th><th scope="col">Utilisation</th><th scope="col">Result</th><th scope="col">Indicator</th></tr></thead>
        <tbody>{results.map((row, i) => <tr key={`${row.test}-${row.label || ""}-${i}`} className={selectedIndex === i ? "is-selected" : ""}>
          <td><button className="workflow-result-select" type="button" onClick={() => setSelectedIndex(i)} aria-pressed={selectedIndex === i}>{testName(row.test)}{row.label ? <small>{row.label}</small> : null}</button></td><td>{mass(row.load)}</td><td>{row.mpe == null ? "—" : `± ${mass(Math.abs(Number(row.mpe)))}`}</td><td>{mass(row.error)}</td><td>{pct(row.utilisation)}</td><td><Outcome value={row.result}/></td><td>{row.marginal === true ? <span className="workflow-marginal" aria-label="Marginal: close to permitted error boundary">Marginal</span> : "—"}</td>
        </tr>)}</tbody></table></div> : <p className="workflow-empty-results">The engine returned no individual result rows.</p>}
    </section>

    {selected && <section className="workflow-result-detail" aria-live="polite">
      <div className="workflow-card workflow-result-explanation">
        <div className="workflow-section-heading"><div><p className="instrument-eyebrow">Selected result · {testName(selected.test)}</p><h2>{selected.label || testName(selected.test)}</h2></div><Outcome value={selected.result}/></div>
        <div className="workflow-error-mpe"><div><span>Measured error</span><strong>{mass(selected.error)}</strong></div><span aria-hidden="true">vs</span><div><span>Maximum Permissible Error</span><strong>{selected.mpe == null ? "—" : `± ${mass(Math.abs(Number(selected.mpe)))}`}</strong></div><div><span>Utilisation</span><strong>{pct(selected.utilisation)}</strong></div>{selected.e != null && <div><span>Verification interval (e)</span><strong>{mass(selected.e)}</strong></div>}{selected.method && <div><span>Evaluation method</span><strong>{selected.method}</strong></div>}</div>
        {selected.marginal === true && <p className="workflow-marginal-note"><strong>Marginal result</strong> — the engine marked this passing result as close to the permitted error boundary.</p>}
        {selected.explanation && <div className="workflow-explanation"><h3>What this means</h3><p>{selected.explanation}</p></div>}
        {selected.clause && <div className="workflow-clause"><span>Applicable clause</span><strong>{selected.clause}</strong></div>}
      </div>
      {canCompare && <section className="workflow-card workflow-r76-card" aria-labelledby="r76-check-title"><p className="instrument-eyebrow">Rounding trap signature</p><h2 id="r76-check-title">R76 Changeover-Point Check</h2><p>Compare the naive display-based evaluation with the engine’s R76 evaluation for this observation.</p>
        {chartRows.length > 1 && <ChangeoverChart rows={chartRows}/>}
        <div className="workflow-r76-flow"><div><span>Naive / display-rounding evaluation</span><strong>{mass(selected.naive_error)}</strong><small>Error from displayed indication</small><Outcome value={selected.naive_result}/></div><span className="workflow-r76-arrow" aria-hidden="true">↓</span><div><span>R76 changeover-point evaluation</span><strong>{mass(selected.error)}</strong><small>Engine-evaluated error · MPE {selected.mpe == null ? "—" : `± ${mass(Math.abs(Number(selected.mpe)))}`}</small><Outcome value={selected.result}/></div></div>
        {(selected.naive_result !== selected.result || selected.naive_error !== selected.error) && <p className="workflow-r76-difference">The displayed-value calculation and R76 changeover-point evaluation differ for this reading.</p>}
      </section>}
    </section>}

    {Object.keys(session.observations || {}).length > 0 && <details className="workflow-card workflow-raw-data"><summary>View raw data / readings <span>{Object.keys(session.observations).length} observation types</span></summary><p>These are the observations saved for this session and used by the evaluation engine.</p><div className="workflow-raw-data__list">{Object.entries(session.observations).map(([key, value]) => <details key={key}><summary>{testName(key)}</summary><pre>{JSON.stringify(value, null, 2)}</pre></details>)}</div></details>}

    {notice && <div className="workflow-notice" role="status">{notice}</div>}
    <div className="workflow-actions workflow-results-actions"><Link className="instrument-button instrument-button--secondary" to={`/app/sessions/${sessionId}`}>Back to Test Session</Link><span className="workflow-actions__spacer"/><Link className="instrument-button instrument-button--secondary" to="/app/history">Session History</Link>{canSubmit && <button className="instrument-button instrument-button--primary" type="button" onClick={() => { setSubmitError(""); setConfirming(true); }}>{"Submit for Review"}<span aria-hidden="true"> →</span></button>}</div>
    {session.status === "Submitted" && <p className="workflow-submitted-note" role="status">This evaluation has been submitted and is waiting in the reviewer queue.</p>}
    {confirming && <div className="workflow-confirm-backdrop"><section className="workflow-submit-confirm" role="alertdialog" aria-modal="true" aria-labelledby="submit-confirm-title" aria-describedby="submit-confirm-description"><p className="instrument-eyebrow">Maker-checker review</p><h2 id="submit-confirm-title">Submit this test session for review?</h2><p id="submit-confirm-description">After submission, the session will be available in the reviewer queue and its readings will be locked for editing.</p><dl><div><dt>Session</dt><dd>{session.id}</dd></div><div><dt>Instrument</dt><dd>{inst.manufacturer} · {inst.model}</dd></div><div><dt>Ruleset</dt><dd>{verdict.ruleset_version || session.ruleset_version || "—"}</dd></div><div><dt>Evaluation</dt><dd>{outcome(verdict.overall)}</dd></div></dl>{submitError && <div className="workflow-error" role="alert">{submitError}</div>}<div className="workflow-actions"><button className="instrument-button instrument-button--secondary" type="button" onClick={() => setConfirming(false)} disabled={submitting}>Cancel</button><button className="instrument-button instrument-button--primary" type="button" onClick={submitForReview} disabled={submitting}>{submitting ? "Submitting…" : "Confirm Submit"}</button></div></section></div>}
  </div>;
}
