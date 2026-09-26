import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/apiClient";
import { useAuth } from "../../auth/AuthContext";
import scale from "../../assets/hero/scale2.png";
import SessionAttachments from "../../components/SessionAttachments";
import "./TestWorkflow.css";

const names = { weighing: "Weighing", eccentricity: "Eccentricity", repeatability: "Repeatability", discrimination: "Discrimination", zero_setting: "Zero Setting", tare_setting: "Tare", temperature: "Temperature", disturbance: "Disturbances", disturbances: "Disturbances" };
const testKeys = (plan) => Object.keys(plan || {}).filter((key) => key !== "ruleset_version" && Boolean(names[key]));
const observationKey = (key) => key === "disturbance" ? "disturbances" : key;
const fmt = (x) => Number(x).toLocaleString(undefined, { maximumFractionDigits: 4 });
function blank(test, p) {
  if (test === "weighing") return p.points.map((x) => ({ load: x.load, mpe: x.mpe, indication: "", delta_l: "", label: x.reason }));
  if (test === "eccentricity") return { readings: p.positions.map((label) => ({ load: p.load, indication: "", delta_l: "", label })) };
  if (test === "repeatability") return p.series.map((s) => ({ readings: Array.from({ length: s.weighings }, (_, i) => ({ load: s.load, indication: "", delta_l: "", label: "Reading " + (i + 1) })) }));
  if (test === "discrimination") return p.points.map((x) => ({ load: x.load, indication_before: "", indication_after: "" }));
  if (test === "zero_setting" || test === "tare_setting") return { load: 0, indication: "", delta_l: "" };
  if (test === "temperature") return { runs: p.sequence_c.map((temperature) => ({ temperature, load: 0, indication: "", delta_l: "", zero_indication: "", zero_required: p.zero_reading_required === true })) };
  if (test === "disturbance" || test === "disturbances") return (Array.isArray(p) ? p : p.items || p.points || p.disturbances || (p.name ? [p] : [])).map((item) => ({ name: item.name || item.label || "Disturbance", indication_without: "", indication_with: "" }));
  return null;
}
function payload(test, v) {
  const n = (x) => x === "" || x == null ? NaN : Number(x);
  const reading = (r) => ({ load: n(r.load), indication: n(r.indication), ...(r.delta_l !== "" && r.delta_l != null ? { delta_l: n(r.delta_l) } : {}), ...(r.label ? { label: r.label } : {}) });
  if (test === "weighing") return v.map(reading);
  if (test === "eccentricity") return { readings: v.readings.map(reading) };
  if (test === "repeatability") return v.map((s) => ({ readings: s.readings.map(reading) }));
  if (test === "discrimination") return v.map((r) => ({ load: n(r.load), indication_before: n(r.indication_before), indication_after: n(r.indication_after) }));
  if (test === "zero_setting" || test === "tare_setting") return reading(v);
  if (test === "temperature") return v.runs.map((r) => ({ temperature: n(r.temperature), readings: [reading({ load: r.load, indication: r.indication, delta_l: r.delta_l, label: "temperature reading" })], ...(r.zero_indication !== "" && r.zero_indication != null ? { zero_reading: reading({ load: 0, indication: r.zero_indication, label: "zero reading" }) } : {}) }));
  if (test === "disturbance" || test === "disturbances") return v.map((r) => ({ name: r.name, indication_without: n(r.indication_without), indication_with: n(r.indication_with) }));
}
function complete(test, v) {
  const ok = (x) => x !== "" && x != null && Number.isFinite(Number(x));
  if (test === "weighing" || test === "discrimination") return v.length > 0 && v.every((r) => Object.entries(r).filter(([k]) => !["label", "reason", "mpe", "delta_l"].includes(k)).every(([, x]) => ok(x)));
  if (test === "eccentricity") return v.readings.length > 0 && v.readings.every((r) => ok(r.load) && ok(r.indication));
  if (test === "repeatability") return v.length > 0 && v.every((s) => s.readings.length > 0 && s.readings.every((r) => ok(r.load) && ok(r.indication)));
  if (test === "zero_setting" || test === "tare_setting") return ok(v.load) && ok(v.indication);
  if (test === "temperature") return v.runs.length > 0 && v.runs.every((r) => ok(r.temperature) && ok(r.load) && ok(r.indication) && (!r.zero_required || ok(r.zero_indication)));
  if (test === "disturbance" || test === "disturbances") return v.length > 0 && v.every((r) => ok(r.indication_without) && ok(r.indication_with));
  return true;
}
export default function TestSessionWizard() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [session, setSession] = useState(null), [plan, setPlan] = useState(null), [values, setValues] = useState({});
  const [step, setStep] = useState(0), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false), [verdict, setVerdict] = useState(null), [errorStep, setErrorStep] = useState("");
  useEffect(() => {
    let active = true;
    api.getSession(sessionId).then(async (s) => {
      const p = await api.getTestPlan(s.instrument_id);
      if (!active) return;
      setSession(s); setPlan(p);
      const tests = testKeys(p);
      const restored = { ...(s.observations || {}) };
      tests.forEach((k) => { if (restored[k] == null && restored[observationKey(k)] == null) restored[k] = blank(k, p[k]); else if (restored[k] == null) restored[k] = restored[observationKey(k)]; });
      if (Array.isArray(s.observations?.weighing) && tests.includes("weighing")) restored.weighing = s.observations.weighing.map((reading, i) => ({ ...blank("weighing", p.weighing)[i], ...reading }));
      if (s.observations?.eccentricity?.readings && tests.includes("eccentricity")) restored.eccentricity = { readings: s.observations.eccentricity.readings.map((reading, i) => ({ ...blank("eccentricity", p.eccentricity).readings[i], ...reading })) };
      if (Array.isArray(s.observations?.repeatability) && tests.includes("repeatability")) restored.repeatability = s.observations.repeatability.map((series, si) => ({ readings: series.readings.map((reading, ri) => ({ ...blank("repeatability", p.repeatability)[si].readings[ri], ...reading })) }));
      if (Array.isArray(s.observations?.temperature) && tests.includes("temperature")) restored.temperature = { runs: s.observations.temperature.map((run) => ({ temperature: run.temperature, load: run.readings?.[0]?.load ?? 0, indication: run.readings?.[0]?.indication ?? "", delta_l: run.readings?.[0]?.delta_l ?? "", zero_indication: run.zero_reading?.indication ?? "", zero_required: p.temperature.zero_reading_required === true })) };
      setValues(restored);
      const first = tests.findIndex((k) => s.observations?.[k] == null);
      setStep(Object.keys(s.observations || {}).length === 0 ? 0 : first < 0 ? tests.length + 1 : first + 1);
      if (s.verdict_detail) setVerdict(s.verdict_detail);
    }).catch((e) => { if (active) setError(e.message || "Could not load this test session."); });
    return () => { active = false; };
  }, [sessionId]);
  const tests = useMemo(() => plan ? testKeys(plan) : [], [plan]);
  const steps = useMemo(() => ["Instrument", ...tests, "Review"], [tests]);
  const test = step > 0 && step <= tests.length ? tests[step - 1] : null;
  const current = test ? values[test] : null;
  function update(t, path, key, value) {
    setValues((old) => { const copy = structuredClone(old); let target = copy[t]; path.forEach((p) => { target = target[p]; }); target[key] = value; return copy; });
  }
  function input(t, path, row, key, title, unit = "g") {
    return <label className="workflow-cell" key={key}><span>{title}{unit ? " (" + unit + ")" : ""}</span><input type="number" inputMode="decimal" step="any" value={row[key] ?? ""} onChange={(e) => update(t, path, key, e.target.value)} /></label>;
  }
  function renderTest() {
    if (test === "weighing") return <div className="workflow-measurement-list">{current.map((r, i) => <div className="workflow-measurement-row workflow-measurement-row--reading" key={i}><div className="workflow-row-title"><strong>Point {i + 1}</strong><span>{r.label}</span><small>Load {fmt(r.load)} g · MPE ±{fmt(r.mpe)} g</small></div>{input(test, [i], r, "indication", "Displayed indication")}{input(test, [i], r, "delta_l", "ΔL changeover addition", "g · optional")}</div>)}</div>;
    if (test === "eccentricity") return <div className="workflow-measurement-list">{current.readings.map((r, i) => <div className="workflow-measurement-row workflow-measurement-row--reading" key={i}><div className="workflow-row-title"><strong>{r.label}</strong><small>Load {fmt(r.load)} g</small></div>{input(test, ["readings", i], r, "indication", "Displayed indication")}{input(test, ["readings", i], r, "delta_l", "ΔL changeover addition", "g · optional")}</div>)}</div>;
    if (test === "repeatability") return <div className="workflow-series-list">{current.map((s, si) => <section className="workflow-series" key={si}><h3>Series {si + 1} <small>· Load {fmt(s.readings[0]?.load)} g</small></h3>{s.readings.map((r, ri) => <div className="workflow-measurement-row workflow-measurement-row--reading" key={ri}><div className="workflow-row-title"><strong>Reading {ri + 1}</strong></div>{input(test, [si, "readings", ri], r, "indication", "Displayed indication")}{input(test, [si, "readings", ri], r, "delta_l", "ΔL changeover addition", "g · optional")}</div>)}</section>)}</div>;
    if (test === "discrimination") return <div className="workflow-measurement-list">{current.map((r, i) => <div className="workflow-measurement-row workflow-measurement-row--wide" key={i}><div className="workflow-row-title"><strong>Point {i + 1}</strong><small>Load {fmt(r.load)} g · Add {fmt(plan.discrimination.points[i].extra_load)} g</small></div>{input(test, [i], r, "indication_before", "Before addition")}{input(test, [i], r, "indication_after", "After addition")}</div>)}</div>;
    if (test === "zero_setting" || test === "tare_setting") return <div className="workflow-measurement-row workflow-measurement-row--wide"><div className="workflow-row-title"><strong>{names[test]} observation</strong><small>Permitted error {fmt(plan[test].limit)} g</small><small>{plan[test].note || plan[test].notes || ""}</small></div>{input(test, [], current, "load", "Applied load")}{input(test, [], current, "indication", "Displayed indication")}{input(test, [], current, "delta_l", "ΔL changeover addition", "g · optional")}</div>;
    if (test === "temperature") return <div className="workflow-measurement-list">{current.runs.map((r, i) => <div className="workflow-measurement-row workflow-measurement-row--wide" key={i}><div className="workflow-row-title"><strong>Temperature {i + 1}</strong><small>{plan.temperature.clause || ""}</small></div>{input(test, ["runs", i], r, "temperature", "Ambient temperature", "°C")}{input(test, ["runs", i], r, "load", "Applied load")}{input(test, ["runs", i], r, "indication", "Displayed indication")}{input(test, ["runs", i], r, "delta_l", "ΔL changeover addition", "g · optional")}{plan.temperature.zero_reading_required && input(test, ["runs", i], r, "zero_indication", "Zero reading")}</div>)}</div>;
    if (test === "disturbance" || test === "disturbances") return <div className="workflow-measurement-list">{current.map((r, i) => <div className="workflow-measurement-row workflow-measurement-row--wide" key={i}><div className="workflow-row-title"><strong>{r.name}</strong></div>{input(test, [i], r, "indication_without", "Indication without disturbance")}{input(test, [i], r, "indication_with", "Indication with disturbance")}</div>)}</div>;
    return null;
  }
  async function save() {
    if (!test) return true;
    if (!complete(test, current)) { setErrorStep(test); setError("Complete each planned reading before saving this step."); return false; }
    setBusy(true); setError(""); setNotice("");
    try { const data = payload(test, current); await api.saveObservation(sessionId, observationKey(test), data); setSession((s) => ({ ...s, observations: { ...s.observations, [observationKey(test)]: data } })); setErrorStep(""); setNotice(names[test] + " readings saved to this draft."); return true; }
    catch (e) { setErrorStep(test); setError(e.message || "These readings could not be saved. Your entries remain on this screen."); return false; }
    finally { setBusy(false); }
  }
  async function next() { if (step > 0 && step <= tests.length && !(await save())) return; setStep((s) => Math.min(s + 1, steps.length - 1)); }
  async function saveDraft() { if (test) await save(); else setNotice(step === 0 ? "This draft session is already stored on the server." : "All completed observations are already stored on the server."); }
  async function evaluate() {
    setBusy(true); setError(""); setNotice("");
    try { const v = await api.evaluate(sessionId); setVerdict(v); setSession((s) => ({ ...s, verdict: v.overall, verdict_detail: v })); navigate("/app/sessions/" + sessionId + "/results", { state: { verdict: v } }); }
    catch (e) { setError(e.message || "Evaluation could not be completed. Check that every planned observation is saved."); }
    finally { setBusy(false); }
  }
  async function refreshSession() {
    const updated = await api.getSession(sessionId);
    setSession(updated);
    return updated;
  }
  if (error && !session) return <div className="workflow-page"><div className="workflow-error" role="alert">{error}</div><Link className="instrument-button instrument-button--secondary" to="/app/sessions">Back to Sessions</Link></div>;
  if (!session || !plan) return <div className="workflow-page"><div className="instrument-state" role="status"><span className="instrument-spinner"/>Loading test session…</div></div>;
  const inst = session.instrument;
  return <div className="workflow-page">
    <div className="instrument-breadcrumb"><Link to="/app/sessions">Test Sessions</Link><span>›</span><span>{session.id}</span><span>›</span><span>{test ? names[test] : step === 0 ? "Instrument" : "Review"}</span></div>
    <header className="workflow-session-heading"><div><p className="instrument-eyebrow">Test Session · {session.id}</p><h1>{step === 0 ? "Verify Instrument" : test ? names[test] + " Test" : "Review Test Entries"}</h1><p>{step === 0 ? "Confirm the instrument details before recording readings." : test ? "Enter the readings for the planned " + names[test].toLowerCase() + " test." : "Check each planned observation before evaluation."}</p></div><span className="workflow-draft-badge">{session.status || "Draft"}</span></header>
    <dl className="workflow-session-context"><div><dt>Instrument</dt><dd>{session.instrument.model} · {session.instrument.serial_no}</dd></div><div><dt>Session</dt><dd>{session.id}</dd></div><div><dt>Status</dt><dd>{session.status || "Draft"}</dd></div><div><dt>Ruleset</dt><dd>{session.ruleset_version || plan.ruleset_version || "—"}</dd></div></dl>
    <nav className="workflow-stepper" aria-label="Test session steps">{steps.map((name, i) => { const saved = i > 0 && session.observations?.[observationKey(name)] != null; const done = i === 0 ? step > 0 : saved; return <button key={name} type="button" disabled={i > step} className={"workflow-step " + (i === step ? "is-current " : "") + (done ? "is-done " : "") + (errorStep === name ? "has-error" : "")} onClick={() => { if (i <= step) setStep(i); }} aria-current={i === step ? "step" : undefined} aria-label={names[name] || name}><span>{i === 0 ? "✓" : i}</span><small>{names[name] || name}</small></button>; })}</nav>
    {error && <div className="workflow-error" role="alert">{error}</div>}{notice && <div className="workflow-notice" role="status">{notice}</div>}
    {busy && step === steps.length - 1 && <div className="workflow-evaluation-loading" role="status"><span className="instrument-spinner"/>Evaluating test results… The engine is checking the saved observations.</div>}
    {step === 0 && <section className="workflow-instrument workflow-instrument--wizard"><img src={scale} alt="Precision weighing instrument"/><div><p className="instrument-eyebrow">{inst.manufacturer}</p><h2>{inst.model}</h2><p>Serial No. {inst.serial_no}</p><dl><div><dt>Max Capacity</dt><dd>{fmt(inst.max_capacity)} g</dd></div><div><dt>Min Capacity</dt><dd>{fmt(inst.min_capacity)} g</dd></div><div><dt>e · d</dt><dd>{fmt(inst.e)} g · {fmt(inst.d ?? inst.e)} g</dd></div><div><dt>Accuracy Class</dt><dd>{inst.accuracy_class}</dd></div></dl><p className="workflow-verified">✓ Instrument details loaded from registered record</p></div><aside className="workflow-session-info"><h2>Session Information</h2><p><span>Session ID</span>{session.id}</p><p><span>Status</span>{session.status}</p><p><span>Started</span>{session.tested_at ? new Date(session.tested_at).toLocaleString() : "Now"}</p></aside></section>}
    {test && <section className="workflow-card workflow-test-card"><div className="workflow-test-heading"><div><h2>{names[test]} Test</h2><p>Plan values are read-only. Record what the instrument displays.</p></div><span className="workflow-plan-clause">{plan[test].clause || "R76 plan"}</span></div>{test === "weighing" && <p className="workflow-guidance">Apply increasing loads up to Max, then decrease back to zero as specified by the ruleset.</p>}{renderTest()}</section>}
    {step === steps.length - 1 && <section className="workflow-card"><h2>Review planned observations</h2><p>Each measurement will be checked by the evaluation engine.</p><div className="workflow-review-list">{tests.map((t) => <div key={t}><span>{names[t]}</span><strong>{session.observations?.[t] ? "Saved" : "Not saved"}</strong><button type="button" className="instrument-link-button" onClick={() => setStep(tests.indexOf(t) + 1)}>Review</button></div>)}</div>{verdict && <div className={"workflow-verdict workflow-verdict--" + verdict.overall?.toLowerCase()}><strong>{verdict.overall}</strong><span>{verdict.results?.length || 0} results · {verdict.failed_tests?.length || 0} failed · Ruleset {verdict.ruleset_version}</span></div>}</section>}
    <SessionAttachments sessionId={session.id} attachments={session.attachments || []} editable={["Tester", "Admin"].includes(user?.role) && ["Draft", "Returned"].includes(session.status)} onRefresh={refreshSession}/>
    <div className="workflow-actions workflow-actions--wizard"><button type="button" className="instrument-button instrument-button--secondary" onClick={saveDraft} disabled={busy}>Save Draft</button><span className="workflow-actions__spacer"/><button type="button" className="instrument-button instrument-button--secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || busy}>← Back</button>{step < steps.length - 1 ? <button type="button" className="instrument-button instrument-button--primary" onClick={next} disabled={busy}>{busy ? "Saving…" : "Next"}<span> →</span></button> : <button type="button" className="instrument-button instrument-button--primary" onClick={evaluate} disabled={busy}>{busy ? "Evaluating…" : verdict ? "Evaluate Again" : "Evaluate Results"}<span> →</span></button>}</div>
  </div>;
}

