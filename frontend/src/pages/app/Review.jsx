import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/apiClient";
import Container from "../../components/Container";
import PageHeader from "../../components/PageHeader";
import { Outcome } from "./TestResults";
import "./Review.css";
import "./TestWorkflow.css";

const dateTime = (value) => value ? new Date(value).toLocaleString() : "—";
const pendingStatuses = ["Submitted", "Under Review"];

export default function Review() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("pending");

  useEffect(() => {
    let active = true;
    api.listSessions().then((rows) => { if (active) setSessions(rows); })
      .catch((e) => { if (active) setError(e.message || "The reviewer queue could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const reviewableSessions = useMemo(() => sessions.filter((session) => session.status !== "Draft"), [sessions]);
  const counts = useMemo(() => ({
    pending: reviewableSessions.filter((s) => pendingStatuses.includes(s.status)).length,
    approved: reviewableSessions.filter((s) => s.status === "Approved").length,
    returned: reviewableSessions.filter((s) => s.status === "Returned").length,
  }), [reviewableSessions]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return reviewableSessions.filter((session) => {
      const matchesStatus = filter === "all" || (filter === "pending" && pendingStatuses.includes(session.status)) || session.status === filter;
      const matchesText = !needle || [session.id, session.serial_no, session.model, session.manufacturer, session.tester, session.verdict, session.status]
        .some((value) => String(value ?? "").toLocaleLowerCase().includes(needle));
      return matchesStatus && matchesText;
    });
  }, [reviewableSessions, filter, query]);

  return <Container className="review-queue-page">
    <PageHeader eyebrow="Maker-checker · Independent review" title="Review Queue" description="Inspect submitted test evidence and evaluation results before approving the record or returning it for correction." />

    <section className="review-metrics" aria-label="Review queue totals">
      <div><span>Pending review</span><strong>{loading ? "—" : counts.pending}</strong></div>
      <div><span>Approved</span><strong>{loading ? "—" : counts.approved}</strong></div>
      <div><span>Returned</span><strong>{loading ? "—" : counts.returned}</strong></div>
    </section>

    <section className="workflow-card review-queue-card" aria-labelledby="review-queue-list-title">
      <div className="review-queue-heading"><div><p className="instrument-eyebrow">Session records</p><h2 id="review-queue-list-title">Submitted testing work</h2><p>Session status, verdict, and tester identity are read from the backend.</p></div><span className="review-record-count">{loading ? "Loading…" : `${visible.length} record${visible.length === 1 ? "" : "s"}`}</span></div>
      <div className="review-queue-controls">
        <label className="workflow-history-search"><span aria-hidden="true">⌕</span><span className="visually-hidden">Search sessions</span><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search session, instrument, manufacturer, or tester" /></label>
        <label className="workflow-history-filter"><span className="visually-hidden">Filter by status</span><select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="pending">Pending review</option><option value="Approved">Approved</option><option value="Returned">Returned</option><option value="all">All statuses</option></select></label>
      </div>

      {error && <div className="workflow-error" role="alert">{error}</div>}
      {loading && <div className="instrument-state" role="status"><span className="instrument-spinner"/>Loading submitted sessions…</div>}
      {!loading && !error && visible.length === 0 && <div className="review-queue-empty" role="status"><strong>{reviewableSessions.length ? "No sessions match this view" : "No session records are available"}</strong><p>{reviewableSessions.length ? "Try another status or search term." : "Submitted sessions will appear here when testers send their evaluations for review."}</p></div>}
      {!loading && !error && visible.length > 0 && <div className="workflow-table-wrap"><table className="workflow-table review-queue-table"><thead><tr><th>Session</th><th>Instrument</th><th>Tester</th><th>Submitted</th><th>Evaluation</th><th>Status</th><th>Action</th></tr></thead><tbody>
        {visible.map((session) => <tr key={session.id}>
          <td><strong>SS-{String(session.id).padStart(4, "0")}</strong><small>Tested {dateTime(session.tested_at)}</small></td>
          <td><strong>{session.manufacturer || "—"}</strong><small>{session.model || "—"} · {session.serial_no || "No serial"}</small></td>
          <td>{session.tester || "—"}</td><td>{dateTime(session.submitted_at)}</td>
          <td>{session.verdict ? <Outcome value={session.verdict}/> : "—"}</td>
          <td><span className={`workflow-history-status workflow-history-status--${String(session.status || "").toLowerCase().replaceAll(" ", "-")}`}>{session.status || "—"}</span></td>
          <td><Link className="instrument-button instrument-button--secondary review-open-button" to={`/app/review/${session.id}`}>{pendingStatuses.includes(session.status) ? "Review" : "View"}<span aria-hidden="true"> →</span></Link></td>
        </tr>)}
      </tbody></table></div>}
    </section>
  </Container>;
}
