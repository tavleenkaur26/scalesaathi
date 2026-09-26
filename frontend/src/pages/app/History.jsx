import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/apiClient";
import "./TestWorkflow.css";

const PAGE_SIZE = 10;
const statusTone = (value) => String(value || "").toLowerCase().replaceAll(" ", "-");

export default function History() {
  const [sessions, setSessions] = useState([]);
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("All results");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError("");
      try {
        const summaries = await api.listSessions();
        const records = await Promise.all(summaries.map(async (summary) => {
          try { return { ...summary, ...(await api.getSession(summary.id)) }; }
          catch { return summary; }
        }));
        if (active) setSessions(records);
      } catch (e) { if (active) setError(e.message || "Session history could not be loaded."); }
      finally { if (active) setLoading(false); }
    }
    load();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sessions.filter((session) => {
      const matchesSearch = !query || [session.id, session.manufacturer, session.model, session.serial_no, session.tested_at, session.status, session.verdict, session.ruleset_version]
        .some((value) => String(value || "").toLowerCase().includes(query));
      const matchesResult = resultFilter === "All results" || (resultFilter === "No evaluation" ? !session.verdict : session.verdict === resultFilter);
      return matchesSearch && matchesResult;
    });
  }, [sessions, search, resultFilter]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function updateSearch(value) { setSearch(value); setPage(1); }
  function updateResultFilter(value) { setResultFilter(value); setPage(1); }

  return <div className="workflow-page workflow-history-page">
    <header className="workflow-session-heading"><div><p className="instrument-eyebrow">Records</p><h1>Test Session History</h1><p>Find submitted evaluations and saved sessions across your accessible instruments.</p></div><Link className="instrument-button instrument-button--secondary" to="/app/sessions">Test Sessions</Link></header>
    <section className="workflow-card workflow-history-card" aria-label="Session history">
      <div className="workflow-history-controls"><label className="workflow-history-search"><span className="visually-hidden">Search sessions</span><span aria-hidden="true">⌕</span><input type="search" value={search} onChange={(event) => updateSearch(event.target.value)} placeholder="Search by session, serial, model, manufacturer…"/></label><label className="workflow-history-filter"><span className="visually-hidden">Filter by evaluation result</span><select value={resultFilter} onChange={(event) => updateResultFilter(event.target.value)}><option>All results</option><option>PASS</option><option>FAIL</option><option>No evaluation</option></select></label></div>
      {error && <div className="workflow-error" role="alert">{error}</div>}
      {loading && <div className="instrument-state" role="status"><span className="instrument-spinner"/>Loading session history…</div>}
      {!loading && !error && filtered.length === 0 && <div className="workflow-empty-results">No sessions match this search and result filter.</div>}
      {!loading && !error && filtered.length > 0 && <>
        <div className="workflow-table-wrap"><table className="workflow-table workflow-history-table"><thead><tr><th scope="col">Date &amp; Time</th><th scope="col">Session</th><th scope="col">Instrument</th><th scope="col">Ruleset</th><th scope="col">Status</th><th scope="col">Result</th><th scope="col">Action</th></tr></thead><tbody>{visible.map((session) => <tr key={session.id}><td>{session.tested_at ? new Date(session.tested_at).toLocaleString() : "—"}</td><td>#{session.id}</td><td><strong>{session.manufacturer} · {session.model}</strong><small>{session.serial_no}</small></td><td>{session.ruleset_version || "—"}</td><td><span className={`workflow-history-status workflow-history-status--${statusTone(session.status)}`}>{session.status || "—"}</span></td><td>{session.verdict ? <span className={`workflow-outcome workflow-outcome--${statusTone(session.verdict)}`}>{session.verdict}</span> : "—"}</td><td><Link className="instrument-row-action" to={session.verdict ? `/app/sessions/${session.id}/results` : `/app/sessions/${session.id}`}>{session.verdict ? "View Results" : "Resume"}</Link></td></tr>)}</tbody></table></div>
        <div className="workflow-history-pagination"><span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} sessions</span><div><button type="button" className="instrument-button instrument-button--secondary instrument-button--small" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1}>Previous</button><span aria-live="polite">{page} / {pageCount}</span><button type="button" className="instrument-button instrument-button--secondary instrument-button--small" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={page >= pageCount}>Next</button></div></div>
      </>}
    </section>
  </div>;
}
