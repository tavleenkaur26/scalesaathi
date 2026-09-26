import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { api } from "../../api/apiClient";
import SessionAttachments from "../../components/SessionAttachments";
import { ChangeoverChart, mass, outcome, Outcome, pct, testName } from "./TestResults";
import "./TestWorkflow.css";
import "./Review.css";

const formatDate = (value) => value ? new Date(value).toLocaleString() : "—";
const statusesInReview = ["Submitted", "Under Review"];

function SummaryField({ label, children }) {
  return <div className="review-detail-field"><span>{label}</span><strong>{children ?? "—"}</strong></div>;
}

export default function ReviewSession() {
  const { sessionId } = useParams();
  const { user } = useAuth();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dialog, setDialog] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true); setLoadError(""); setSession(null); setSelectedIndex(0);
    api.getSession(sessionId).then((data) => { if (active) setSession(data); })
      .catch((e) => { if (active) setLoadError(e.message || "The session could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [sessionId]);

  const verdict = session?.verdict_detail;
  const results = verdict?.results || [];
  const selected = results[selectedIndex] || null;
  const instrument = session?.instrument || {};
  const isMaker = session && Number(session.tester_id) === Number(user?.user_id);
  const reviewerRole = ["Reviewer", "Admin"].includes(user?.role);
  const canDecide = reviewerRole && !isMaker && statusesInReview.includes(session?.status);
  const chartRows = useMemo(() => results.filter((row) => row.test === "weighing" && row.load != null && row.error != null && row.mpe != null)
    .filter((row, index, rows) => Number.isFinite(Number(row.load)) && Number.isFinite(Number(row.error)) && Number.isFinite(Number(row.mpe)) && (index === 0 || Number(row.load) !== Number(rows[index - 1].load))), [results]);

  async function refreshAfterDecision(updated, message) {
    setSession(updated);
    setNotice(message);
    setActionError(""); setDialog(""); setComment("");
    try { setSession(await api.getSession(sessionId)); }
    catch { /* The decision response itself is authoritative if a follow-up refresh is unavailable. */ }
  }

  async function approve() {
    if (!canDecide || saving) return;
    setSaving(true); setActionError("");
    try {
      const updated = await api.approve(sessionId);
      await refreshAfterDecision(updated, `Session ${updated.status} successfully.`);
    } catch (e) { setActionError(e.message || "The session could not be approved."); }
    finally { setSaving(false); }
  }

  async function returnForCorrection() {
    if (!canDecide || saving) return;
    setSaving(true); setActionError("");
    try {
      const updated = await api.returnSession(sessionId, comment.trim());
      await refreshAfterDecision(updated, `Session ${updated.status} for correction.`);
    } catch (e) { setActionError(e.message || "The session could not be returned."); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="workflow-page"><div className="instrument-state" role="status"><span className="instrument-spinner"/>Loading review session…</div></div>;
  if (loadError) return <div className="workflow-page"><div className="instrument-breadcrumb"><Link to="/app/review">Review Queue</Link><span aria-hidden="true">›</span><span>Session</span></div><section className="workflow-card review-detail-error" role="alert"><p className="instrument-eyebrow">Review workspace</p><h1>Session unavailable</h1><p>{loadError}</p><Link className="instrument-button instrument-button--secondary" to="/app/review">Back to Review Queue</Link></section></div>;

  return <div className="workflow-page review-detail-page">
    <div className="instrument-breadcrumb"><Link to="/app/review">Review Queue</Link><span aria-hidden="true">›</span><span>Session SS-{String(session.id).padStart(4, "0")}</span></div>
    <header className="workflow-session-heading review-detail-heading"><div><p className="instrument-eyebrow">Independent review · {session.ruleset_version || "Ruleset unavailable"}</p><h1>Review Test Session</h1><p>{instrument.manufacturer || "Manufacturer unavailable"} · {instrument.model || "Model unavailable"} · Serial {instrument.serial_no || "—"}</p></div><div className="review-detail-status"><span className="workflow-draft-badge">{session.status}</span>{verdict?.overall && <Outcome value={verdict.overall}/>}</div></header>

    {notice && <div className="workflow-notice" role="status">{notice} <Link to="/app/review">Return to queue</Link></div>}
    {actionError && <div className="workflow-error" role="alert">{actionError}</div>}
    {session.review_comment && <div className="review-return-note"><strong>Return reason</strong><p>{session.review_comment}</p>{session.reviewer && <small>Recorded by {session.reviewer}</small>}</div>}
    {isMaker && <div className="workflow-error" role="status">Maker-checker restriction: you created this session, so you cannot approve or return it.</div>}

    <section className="workflow-card review-summary-card" aria-labelledby="review-summary-title">
      <div className="review-section-heading"><div><p className="instrument-eyebrow">Session record</p><h2 id="review-summary-title">Session and instrument summary</h2></div><span>Session SS-{String(session.id).padStart(4, "0")}</span></div>
      <div className="review-summary-grid">
        <SummaryField label="Status">{session.status}</SummaryField><SummaryField label="Tester">{session.tester || "—"}</SummaryField><SummaryField label="Submitted">{formatDate(session.submitted_at)}</SummaryField><SummaryField label="Tested">{formatDate(session.tested_at)}</SummaryField>
        <SummaryField label="Manufacturer">{instrument.manufacturer}</SummaryField><SummaryField label="Model">{instrument.model}</SummaryField><SummaryField label="Serial number">{instrument.serial_no}</SummaryField><SummaryField label="Accuracy class">{instrument.accuracy_class}</SummaryField>
        <SummaryField label="Minimum capacity">{mass(instrument.min_capacity)}</SummaryField><SummaryField label="Maximum capacity">{mass(instrument.max_capacity)}</SummaryField><SummaryField label="Verification interval · e">{mass(instrument.e)}</SummaryField><SummaryField label="Ruleset / version">{session.ruleset_version}</SummaryField>
        {session.reviewer && <SummaryField label="Reviewer">{session.reviewer}</SummaryField>}
      </div>
    </section>

    <section className="review-result-summary" aria-label="Evaluation summary">
      <div className={`workflow-overall workflow-overall--${String(verdict?.overall || "unknown").toLowerCase()}`}><div className="workflow-overall__mark" aria-hidden="true">{verdict?.overall === "PASS" ? "✓" : verdict?.overall === "FAIL" ? "!" : "—"}</div><div className="workflow-overall__result"><span>Overall result</span><strong>{outcome(verdict?.overall)}</strong></div><div className="workflow-overall__stat"><span>Evaluation method</span><strong>{verdict?.ruleset_version || session.ruleset_version || "—"}</strong></div><div className="workflow-overall__stat"><span>Test rows</span><strong>{results.length}</strong></div><div className="workflow-overall__stat"><span>Marginal results</span><strong>{verdict?.marginal_results ?? "—"}</strong></div></div>
    </section>

    <section className="workflow-card review-results-card" aria-labelledby="review-results-title"><div className="review-section-heading"><div><p className="instrument-eyebrow">Engine output</p><h2 id="review-results-title">Test-wise results</h2><p>Select a test to inspect its engine explanation and changeover-point evaluation.</p></div><span>{results.length} row{results.length === 1 ? "" : "s"}</span></div>
      {results.length ? <div className="workflow-table-wrap"><table className="workflow-table workflow-results-table"><thead><tr><th>Test</th><th>Load</th><th>MPE</th><th>Error</th><th>Utilisation</th><th>Result</th><th>Marginal</th></tr></thead><tbody>{results.map((row, index) => <tr key={`${row.test}-${row.label || ""}-${index}`} className={index === selectedIndex ? "is-selected" : ""}><td><button className="workflow-result-select" type="button" onClick={() => setSelectedIndex(index)} aria-pressed={index === selectedIndex}>{testName(row.test)}{row.label && <small>{row.label}</small>}</button></td><td>{mass(row.load)}</td><td>{row.mpe == null ? "—" : `± ${mass(Math.abs(Number(row.mpe)))}`}</td><td>{mass(row.error)}</td><td>{pct(row.utilisation)}</td><td><Outcome value={row.result}/></td><td>{row.marginal ? <span className="workflow-marginal">Marginal</span> : "—"}</td></tr>)}</tbody></table></div> : <div className="review-queue-empty"><strong>No saved evaluation rows</strong><p>This session detail contains no engine result rows to review.</p></div>}
    </section>

    {selected && <section className="review-selected-grid" aria-live="polite">
      <section className="workflow-card review-explanation-card"><div className="review-section-heading"><div><p className="instrument-eyebrow">Selected result · {testName(selected.test)}</p><h2>{selected.label || testName(selected.test)}</h2></div><Outcome value={selected.result}/></div>
        <div className="workflow-error-mpe"><div><span>Measured error</span><strong>{mass(selected.error)}</strong></div><span aria-hidden="true">vs</span><div><span>Maximum permissible error</span><strong>{selected.mpe == null ? "—" : `± ${mass(Math.abs(Number(selected.mpe)))}`}</strong></div><div><span>Utilisation</span><strong>{pct(selected.utilisation)}</strong></div>{selected.e != null && <div><span>Verification interval (e)</span><strong>{mass(selected.e)}</strong></div>}<div><span>Load</span><strong>{mass(selected.load)}</strong></div></div>
        {selected.marginal && <p className="workflow-marginal-note"><strong>Marginal result</strong> — the engine marks this passing result close to the permitted error boundary.</p>}
        <div className="workflow-explanation"><h3>Engine explanation</h3><p>{selected.explanation || "No explanation was returned for this result."}</p></div>
        {selected.clause && <div className="workflow-clause"><span>Applicable clause</span><strong>{selected.clause}</strong></div>}
      </section>
      <section className="workflow-card workflow-r76-card review-r76-card" aria-labelledby="review-r76-title"><p className="instrument-eyebrow">OIML R76 · Engine details</p><h2 id="review-r76-title">Changeover-point analysis</h2><p>These values are returned by the evaluation engine for the selected test.</p>
        <div className="review-r76-values"><div><span>Naive error</span><strong>{mass(selected.naive_error)}</strong><small>{selected.naive_result || "Not reported"}</small></div><div><span>R76 error</span><strong>{mass(selected.error)}</strong><small>{selected.result || "Not reported"}</small></div></div>
        {chartRows.length > 1 ? <ChangeoverChart rows={chartRows}/> : <p className="review-chart-empty">The backend returned fewer than two weighing points; no comparison chart can be drawn.</p>}
        {selected.naive_error != null && selected.naive_result != null && (selected.naive_error !== selected.error || selected.naive_result !== selected.result) && <p className="workflow-r76-difference">The display-based result differs from the R76 changeover-point result for this test.</p>}
      </section>
    </section>}

    <details className="workflow-card workflow-raw-data review-raw-data"><summary>View raw readings <span>{Object.keys(session.observations || {}).length} saved observation types</span></summary><p>Only observations returned by the session API are shown.</p>{Object.keys(session.observations || {}).length ? <div className="workflow-raw-data__list">{Object.entries(session.observations).map(([key, value]) => <details key={key}><summary>{testName(key)}</summary><pre>{JSON.stringify(value, null, 2)}</pre></details>)}</div> : <p className="review-no-data">No saved observations were returned for this session.</p>}</details>

    <SessionAttachments sessionId={session.id} attachments={session.attachments || []} editable={false} title="Attachments" description="Evidence submitted with this test session." className="workflow-card review-attachments"/>

    <div className="workflow-actions review-detail-actions"><Link className="instrument-button instrument-button--secondary" to="/app/review">Back to Review Queue</Link><span className="workflow-actions__spacer"/>{canDecide && <><button className="instrument-button instrument-button--secondary" type="button" onClick={() => { setActionError(""); setComment(""); setDialog("return"); }}>Return for Correction</button><button className="instrument-button instrument-button--primary" type="button" onClick={() => { setActionError(""); setDialog("approve"); }}>Approve Test</button></>}{!canDecide && !isMaker && <span className="review-actions-locked">Review actions are unavailable for status “{session.status}”.</span>}</div>

    {dialog && <div className="workflow-confirm-backdrop"><section className="workflow-submit-confirm review-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="review-confirm-title" aria-describedby="review-confirm-description"><p className="instrument-eyebrow">Maker-checker decision</p><h2 id="review-confirm-title">{dialog === "approve" ? "Approve this test?" : "Return this test for correction?"}</h2><p id="review-confirm-description">{dialog === "approve" ? "Approval creates the verified session record. Confirm only after reviewing the submitted readings and evaluation." : "The tester will be able to edit and resubmit this session. Explain what needs correction."}</p><dl><div><dt>Session</dt><dd>SS-{String(session.id).padStart(4, "0")}</dd></div><div><dt>Tester</dt><dd>{session.tester || "—"}</dd></div><div><dt>Current status</dt><dd>{session.status}</dd></div><div><dt>Evaluation</dt><dd>{outcome(verdict?.overall)}</dd></div></dl>
      {dialog === "return" && <label className="review-comment-field">Reviewer comment / reason<textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} maxLength={2000} placeholder="Describe the correction required…" required/></label>}
      {actionError && <div className="workflow-error" role="alert">{actionError}</div>}
      <div className="workflow-actions"><button className="instrument-button instrument-button--secondary" type="button" onClick={() => setDialog("")} disabled={saving}>Cancel</button><button className="instrument-button instrument-button--primary" type="button" onClick={dialog === "approve" ? approve : returnForCorrection} disabled={saving || (dialog === "return" && !comment.trim())}>{saving ? "Saving…" : dialog === "approve" ? "Confirm Approval" : "Confirm Return"}</button></div>
    </section></div>}
  </div>;
}
