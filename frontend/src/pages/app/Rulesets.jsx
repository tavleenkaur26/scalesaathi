import { useCallback, useEffect, useState } from "react";
import Container from "../../components/Container";
import PageHeader from "../../components/PageHeader";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const TOKEN_KEY = "ss_token";

async function request(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = { ...(options.body ? { "Content-Type": "application/json" } : {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const d = data && data.detail;
    const err = new Error(typeof d === "string" ? d : d ? JSON.stringify(d) : `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

const C = { ink: "#2a1a10", muted: "#7a6b58", line: "#e2d7bf", card: "#fffdf3", soft: "#f6efdc",
  accent: "#a5623a", ok: "#2f6b3b", bad: "#8a2c2c", warn: "#8a5a12" };
const card = { background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: "20px 24px", marginTop: 20 };
const h2 = { margin: "0 0 4px", fontSize: 20, color: C.ink };
const sub = { margin: "0 0 14px", fontSize: 13, color: C.muted };
const btn = { background: C.accent, color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", cursor: "pointer", fontSize: 13, letterSpacing: 0.5 };
const ghost = { ...btn, background: "transparent", color: C.accent, border: `1px solid ${C.accent}` };
const off = { opacity: 0.5, cursor: "not-allowed" };
const th = { textAlign: "left", padding: "8px 10px", color: C.muted, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, borderBottom: `1px solid ${C.line}` };
const td = { padding: "9px 10px", borderBottom: `1px solid ${C.line}`, fontSize: 14, color: C.ink, verticalAlign: "top" };
const TABS = ["Overview", "Classification", "MPE", "Test Rules", "Environmental", "Advisories"];
const ENV_KEYS = ["default_temperature_range_c", "temperature_range_min_width_c", "zero_temperature_drift", "temperature_test_sequence_c"];
const SEG = ["#8fbf8f", "#e2c46a", "#d98f6a", "#b85c5c"];

const human = (s) => s.replace(/_/g, " ");
const fmt = (v) => (v === null || v === undefined ? "no limit" : typeof v === "object" ? JSON.stringify(v) : String(v));
const count = (d, f) => Object.values(d?.classes || {}).reduce((n, c) => n + (c[f]?.bands?.length || 0), 0);

function stats(d) {
  const flags = [];
  Object.values(d.classes || {}).forEach((c) => { flags.push(c.classification?.verified, c.mpe?.verified); });
  Object.values(d.rules || {}).forEach((r) => flags.push(r.verified));
  const pct = flags.length ? Math.round((flags.filter(Boolean).length / flags.length) * 100) : 0;
  return { classes: Object.keys(d.classes || {}).length, mpe: count(d, "mpe"), rules: Object.keys(d.rules || {}).length, pct };
}

function pick(o, keys) {
  for (const k of keys) {
    if (typeof o?.[k] === "number") return o[k];
    if (Array.isArray(o?.[k])) return o[k].length;
  }
  return null;
}

const Badge = ({ children, color = C.ok }) => (
  <span style={{ background: color, color: "#fff", borderRadius: 20, padding: "2px 10px", fontSize: 11, letterSpacing: 1, marginLeft: 10, verticalAlign: "middle" }}>{children}</span>
);
const Tick = ({ ok }) => <span style={{ color: ok ? C.ok : C.warn }}>{ok ? "✓ Verified" : "Unverified"}</span>;

function Table({ cols, rows }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{cols.map((c) => <th key={c} style={th}>{c}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((x, j) => <td key={j} style={td}>{x}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function StatBox({ label, value, color = C.ink }) {
  return (
    <div style={{ flex: 1, minWidth: 90, textAlign: "center", padding: "10px 6px" }}>
      <div style={{ fontSize: 30, color, fontFamily: "Georgia, serif" }}>{value}</div>
      <div style={{ fontSize: 12, color: C.muted, letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
}

function Impact({ data }) {
  const checked = pick(data, ["sessions_checked", "checked", "total", "sessions_total"]);
  const affected = pick(data, ["sessions_affected", "affected", "changed"]);
  const flipped = pick(data, ["verdicts_flipped", "flipped", "verdict_changes"]);
  const known = [checked, affected, flipped].some((x) => x !== null);
  return (
    <div>
      {known && (
        <div style={{ display: "flex", gap: 8, background: C.soft, borderRadius: 10, marginBottom: 12 }}>
          <StatBox label="Sessions checked" value={checked ?? "-"} />
          <StatBox label="Affected" value={affected ?? "-"} color={C.bad} />
          <StatBox label="Verdicts flipped" value={flipped ?? "-"} color={C.bad} />
        </div>
      )}
      <details open={!known}>
        <summary style={{ cursor: "pointer", color: C.muted, fontSize: 13 }}>Full impact report</summary>
        <pre style={{ background: C.soft, padding: 14, borderRadius: 8, overflowX: "auto", fontSize: 12, color: C.ink }}>{JSON.stringify(data, null, 2)}</pre>
      </details>
    </div>
  );
}

function OverviewTab({ d }) {
  const s = stats(d);
  return (
    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
      <div style={{ ...card, flex: 2, minWidth: 280, marginTop: 0 }}>
        <h2 style={h2}>About this ruleset</h2>
        <p style={{ color: C.ink, fontSize: 14, lineHeight: 1.6 }}>{d.description || "No description provided."}</p>
      </div>
      <div style={{ ...card, flex: 1, minWidth: 240, marginTop: 0 }}>
        <h2 style={h2}>Key statistics</h2>
        <Table cols={["Item", "Value"]} rows={[
          ["Ruleset ID", d.id], ["Edition", d.edition], ["Version", d.version], ["Unit", d.unit],
          ["Accuracy classes", s.classes], ["MPE bands", s.mpe], ["General rules", s.rules], ["Verified", `${s.pct}%`],
        ]} />
      </div>
    </div>
  );
}

function ClassificationTab({ d }) {
  const rows = [];
  Object.entries(d.classes || {}).forEach(([cls, c]) => (c.classification?.bands || []).forEach((b, i) =>
    rows.push([<b key="c">{i === 0 ? cls : ""}</b>, i === 0 ? c.name : "", `${fmt(b.e_min)} to ${fmt(b.e_max)}`, `${fmt(b.n_min)} to ${fmt(b.n_max)}`, b.min_capacity_e,
      c.classification.clause, <Tick key="t" ok={c.classification.verified} />])));
  return (
    <section style={{ ...card, marginTop: 0 }}>
      <h2 style={h2}>Accuracy classes</h2>
      <p style={sub}>Scale interval e ({d.unit || "g"}) and number of intervals n allowed for each class.</p>
      <Table cols={["Class", "Accuracy", `e range (${d.unit || "g"})`, "n range", "Min capacity (e)", "Clause", "Status"]} rows={rows} />
    </section>
  );
}

function MpeTab({ d }) {
  return (
    <>
      {Object.entries(d.classes || {}).map(([cls, c]) => {
        let lo = 0;
        const bands = (c.mpe?.bands || []).map((b) => { const seg = { lo, hi: b.m_max, e: b.mpe_e }; if (b.m_max !== null) lo = b.m_max; return seg; });
        return (
          <section key={cls} style={{ ...card, marginTop: 0, marginBottom: 20 }}>
            <h2 style={h2}>Class {cls}: {c.name}</h2>
            <p style={sub}>{c.mpe?.clause} · <Tick ok={c.mpe?.verified} /> · m = load ÷ e</p>
            <div style={{ display: "flex", gap: 3 }}>
              {bands.map((b, i) => (
                <div key={i} style={{ flex: 1, background: SEG[i % 4], borderRadius: 6, padding: "10px 8px", textAlign: "center", color: C.ink }}>
                  <div style={{ fontSize: 12 }}>{b.lo} to {b.hi === null ? "above" : `${b.hi}`} e</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>± {b.e} e</div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}

function RulesTab({ d }) {
  const rows = Object.entries(d.rules || {}).filter(([k]) => !ENV_KEYS.includes(k)).map(([k, r]) => [
    <b key="k">{human(k)}</b>, <code key="v">{fmt(r.value)}</code>, r.clause, <span key="n" style={{ color: C.muted, fontSize: 13 }}>{r.note || ""}</span>, <Tick key="t" ok={r.verified} />]);
  return (
    <section style={{ ...card, marginTop: 0 }}>
      <h2 style={h2}>Key test rules</h2>
      <p style={sub}>Every value the engine uses, with the clause it comes from.</p>
      <Table cols={["Rule", "Value", "Clause", "Note", "Status"]} rows={rows} />
    </section>
  );
}

function EnvTab({ d }) {
  const r = d.rules || {};
  const range = r.default_temperature_range_c?.value;
  const widths = r.temperature_range_min_width_c?.value || {};
  const drift = r.zero_temperature_drift?.value || {};
  const seq = r.temperature_test_sequence_c;
  return (
    <section style={{ ...card, marginTop: 0 }}>
      <h2 style={h2}>Environmental conditions</h2>
      <p style={sub}>Temperature limits and drift requirements.</p>
      {range && <p style={{ fontSize: 15, color: C.ink }}>Default temperature range: <b>{range[0]} °C to {range[1]} °C</b> <span style={{ color: C.muted, fontSize: 12 }}>({r.default_temperature_range_c.clause})</span></p>}
      <Table cols={["Class", "Min range width (°C)", "Zero drift"]} rows={Object.keys(d.classes || {}).map((c) => {
        const dr = drift[c] || drift.default;
        return [<b key="c">{c}</b>, widths[c] ?? "-", dr ? `≤ ${dr.e} e per ${dr.per_c} °C` : "-"];
      })} />
      {seq && <p style={{ ...sub, marginTop: 14 }}>{seq.clause}: {seq.note}</p>}
    </section>
  );
}

function AdvisoryTab({ d }) {
  return (
    <section style={{ ...card, marginTop: 0 }}>
      <h2 style={h2}>ScaleSaathi advisory rules</h2>
      <p style={sub}>Our own review flags, not R 76 requirements.</p>
      <Table cols={["Setting", "Value", "Note"]} rows={Object.entries(d.advisory || {}).map(([k, a]) => [
        <b key="k">{human(k)}</b>, <code key="v">{typeof a.value === "number" && a.value <= 1 ? `${a.value * 100}% of MPE` : fmt(a.value)}</code>, a.note])} />
    </section>
  );
}

export default function Rulesets() {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(null);
  const [view, setView] = useState("list");
  const [selected, setSelected] = useState("");
  const [tab, setTab] = useState("Overview");
  const [cache, setCache] = useState({});
  const [impact, setImpact] = useState(null);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState({ name: "", json: null, error: "" });

  const ensure = useCallback(async (ver) => {
    if (!ver) return;
    try {
      const r = await request(`/rulesets/${encodeURIComponent(ver)}`);
      setCache((c) => ({ ...c, [ver]: r.data }));
    } catch (e) { setError(`Could not load rule tables for ${ver}: ${e.message}`); }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await request("/rulesets");
      const arr = Array.isArray(list) ? list : [];
      setVersions(arr);
      const active = arr.find((v) => v.is_active);
      if (active) ensure(active.version);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [ensure]);

  useEffect(() => { load(); }, [load]);

  const active = versions.find((v) => v.is_active);
  const activeData = active ? cache[active.version] : null;

  function openDetail(ver) {
    setSelected(ver); setTab("Overview"); setView("detail"); setMessage(null);
    if (!cache[ver]) ensure(ver);
  }

  async function checkImpact(ver) {
    setBusy(true); setMessage(null); setImpact(null);
    try { setImpact({ version: ver, data: await request(`/rulesets/${encodeURIComponent(ver)}/impact`) }); }
    catch (e) { setMessage({ ok: false, text: e.message }); }
    finally { setBusy(false); }
  }

  async function openActivate(ver) {
    setModal({ version: ver, impact: null, error: "" });
    try { const d = await request(`/rulesets/${encodeURIComponent(ver)}/impact`); setModal({ version: ver, impact: d, error: "" }); }
    catch (e) { setModal({ version: ver, impact: null, error: e.message }); }
  }

  async function confirmActivate() {
    setBusy(true);
    try {
      await request(`/rulesets/${encodeURIComponent(modal.version)}/activate`, { method: "POST" });
      setMessage({ ok: true, text: `Version ${modal.version} is now the active ruleset.` });
      setModal(null);
      await load();
    } catch (e) { setModal((m) => ({ ...m, error: e.message })); }
    finally { setBusy(false); }
  }

  function onFile(e) {
    const f = e.target.files?.[0];
    setFile({ name: f?.name || "", json: null, error: "" });
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { setFile({ name: f.name, json: JSON.parse(reader.result), error: "" }); }
      catch { setFile({ name: f.name, json: null, error: "This file is not valid JSON." }); }
    };
    reader.readAsText(f);
  }

  async function addRuleset() {
    setBusy(true); setMessage(null);
    try {
      await request("/rulesets?activate=false", { method: "POST", body: JSON.stringify(file.json) });
      setMessage({ ok: true, text: `Version ${file.json.version} added as inactive. Check its impact, then activate it.` });
      setFile({ name: "", json: null, error: "" });
      setView("list");
      await load();
    } catch (e) {
      setMessage({ ok: false, text: e.status === 409 ? `Version ${file.json.version} already exists. Change "version" in the file.` : e.status === 422 ? `Rejected by the engine: ${e.message}` : e.message });
    } finally { setBusy(false); }
  }

  const banners = (
    <>
      {error && <div style={{ ...card, background: "#fbeeee", borderColor: "#e3b5b5", color: C.bad }}>{error}</div>}
      {message && <div style={{ ...card, background: message.ok ? "#eef6ee" : "#fbeeee", borderColor: message.ok ? "#b9d6bb" : "#e3b5b5", color: message.ok ? C.ok : C.bad }}>{message.text}</div>}
    </>
  );

  /* ---------------- ADD VIEW ---------------- */
  if (view === "add") {
    const j = file.json;
    const checks = j ? [
      ["Valid JSON", true],
      ["Required sections present (id, version, classes, rules, advisory)", ["id", "version", "classes", "rules", "advisory"].every((k) => k in j)],
      [`Classes detected: ${Object.keys(j.classes || {}).join(", ") || "none"}`, Object.keys(j.classes || {}).length > 0],
      [`MPE bands detected: ${count(j, "mpe")}`, count(j, "mpe") > 0],
    ] : [];
    const valid = j && checks.every((c) => c[1]);
    return (
      <Container>
        <PageHeader eyebrow="Admin" title="Add new ruleset" description="Upload a ruleset JSON. It is validated by the engine and stored inactive." />
        {banners}
        <section style={card}>
          <input type="file" accept=".json,application/json" onChange={onFile} />
          {file.error && <p style={{ color: C.bad }}>{file.error}</p>}
          {j && (
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 18 }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <h2 style={h2}>Detected</h2>
                <Table cols={["Field", "Value"]} rows={[["Ruleset ID", j.id], ["Version", j.version], ["Edition", j.edition]]} />
              </div>
              <div style={{ flex: 1, minWidth: 240 }}>
                <h2 style={h2}>Validation</h2>
                {checks.map(([t, ok]) => <p key={t} style={{ margin: "6px 0", color: ok ? C.ok : C.bad, fontSize: 14 }}>{ok ? "✓" : "✕"} {t}</p>)}
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button style={ghost} onClick={() => setView("list")}>Cancel</button>
            <button style={{ ...btn, ...(valid && !busy ? {} : off) }} disabled={!valid || busy} onClick={addRuleset}>{busy ? "Adding…" : "Add as inactive"}</button>
          </div>
        </section>
      </Container>
    );
  }

  /* ---------------- DETAIL VIEW ---------------- */
  if (view === "detail") {
    const d = cache[selected];
    const v = versions.find((x) => x.version === selected);
    return (
      <Container>
        <PageHeader eyebrow="Admin" title={d?.id || "Ruleset"} description={`Version ${selected}${d?.edition ? ` · Edition ${d.edition}` : ""}`} />
        {banners}
        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
          <button style={ghost} onClick={() => setView("list")}>← All rulesets</button>
          {v?.is_active ? <Badge>ACTIVE</Badge> : <button style={btn} onClick={() => openActivate(selected)}>Activate…</button>}
          {!v?.is_active && <button style={{ ...ghost, ...(busy ? off : {}) }} disabled={busy} onClick={() => checkImpact(selected)}>Check impact</button>}
        </div>
        {impact?.version === selected && <section style={card}><h2 style={h2}>Impact of {selected}</h2><Impact data={impact.data} /></section>}
        <div style={{ display: "flex", gap: 4, margin: "20px 0", borderBottom: `1px solid ${C.line}`, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 14px", fontSize: 14,
              color: tab === t ? C.accent : C.muted, borderBottom: `2px solid ${tab === t ? C.accent : "transparent"}` }}>{t}</button>
          ))}
        </div>
        {!d ? <p style={{ color: C.muted }}>Loading rule tables…</p> : (
          <>
            {tab === "Overview" && <OverviewTab d={d} />}
            {tab === "Classification" && <ClassificationTab d={d} />}
            {tab === "MPE" && <MpeTab d={d} />}
            {tab === "Test Rules" && <RulesTab d={d} />}
            {tab === "Environmental" && <EnvTab d={d} />}
            {tab === "Advisories" && <AdvisoryTab d={d} />}
          </>
        )}
        {modal && <ActivateModal modal={modal} busy={busy} onClose={() => setModal(null)} onConfirm={confirmActivate} />}
      </Container>
    );
  }

  /* ---------------- LIST VIEW ---------------- */
  const s = activeData ? stats(activeData) : null;
  return (
    <Container>
      <PageHeader eyebrow="Admin" title="Rulesets" description="Versioned R 76 rule tables. Uploading a new version shows which past verdicts would change." />
      {banners}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <button style={btn} onClick={() => { setMessage(null); setView("add"); }}>+ Add ruleset</button>
      </div>
      <section style={card}>
        <h2 style={h2}>Active ruleset {active && <Badge>ACTIVE</Badge>}</h2>
        {loading ? <p style={{ color: C.muted }}>Loading…</p> : !active ? <p style={{ color: C.muted }}>No active ruleset.</p> : (
          <>
            <p style={{ ...sub, fontSize: 15, color: C.ink }}>{active.ruleset_id} · Version {active.version}{activeData?.edition ? ` · Edition ${activeData.edition}` : ""}</p>
            {s && (
              <div style={{ display: "flex", gap: 8, background: C.soft, borderRadius: 10, marginBottom: 14 }}>
                <StatBox label="Classes" value={s.classes} /><StatBox label="MPE bands" value={s.mpe} />
                <StatBox label="Rules" value={s.rules} /><StatBox label="Verified" value={`${s.pct}%`} color={C.ok} />
              </div>
            )}
            <button style={ghost} onClick={() => openDetail(active.version)}>View details →</button>
          </>
        )}
      </section>
      <section style={card}>
        <h2 style={h2}>Ruleset versions</h2>
        <p style={sub}>Open a version to see its rule tables. Check impact before activating a new one.</p>
        {versions.length === 0 && !loading && !error ? <p style={{ color: C.muted }}>No rulesets stored yet.</p> : (
          <Table cols={["Version", "Ruleset", "Status", "Created", "Actions"]} rows={versions.map((v) => [
            <b key="v">{v.version}</b>, v.ruleset_id,
            v.is_active ? <span key="s" style={{ color: C.ok }}>Active</span> : <span key="s" style={{ color: C.muted }}>Inactive</span>,
            v.created_at ? new Date(v.created_at).toLocaleString() : "-",
            <div key="a" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={ghost} onClick={() => openDetail(v.version)}>View</button>
              {!v.is_active && <button style={{ ...ghost, ...(busy ? off : {}) }} disabled={busy} onClick={() => checkImpact(v.version)}>Check impact</button>}
              {!v.is_active && <button style={btn} onClick={() => openActivate(v.version)}>Activate…</button>}
            </div>,
          ])} />
        )}
      </section>
      {impact && <section style={card}><h2 style={h2}>Impact analysis: {impact.version}</h2><p style={sub}>Dry run against every stored session. Nothing is modified.</p><Impact data={impact.data} /></section>}
      {modal && <ActivateModal modal={modal} busy={busy} onClose={() => setModal(null)} onConfirm={confirmActivate} />}
    </Container>
  );
}

function ActivateModal({ modal, busy, onClose, onConfirm }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(42,26,16,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
      <div style={{ background: C.card, borderRadius: 14, padding: 26, width: "100%", maxWidth: 520, maxHeight: "85vh", overflowY: "auto" }}>
        <h2 style={h2}>Activate ruleset</h2>
        <p style={{ color: C.ink, fontSize: 14 }}>You are about to make version <b>{modal.version}</b> the active evaluation ruleset.</p>
        {modal.error && <p style={{ color: C.bad }}>{modal.error}</p>}
        {!modal.impact && !modal.error ? <p style={{ color: C.muted }}>Calculating impact…</p> : modal.impact && <Impact data={modal.impact} />}
        <p style={{ background: "#fdf6e3", border: "1px solid #e3c98f", color: C.warn, borderRadius: 8, padding: "10px 12px", fontSize: 13 }}>
          Stored sessions are not modified by this preview. New evaluations will use this ruleset once it is active.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
          <button style={ghost} onClick={onClose}>Cancel</button>
          <button style={{ ...btn, ...(busy || !modal.impact ? off : {}) }} disabled={busy || !modal.impact} onClick={onConfirm}>{busy ? "Activating…" : "Activate"}</button>
        </div>
      </div>
    </div>
  );
}