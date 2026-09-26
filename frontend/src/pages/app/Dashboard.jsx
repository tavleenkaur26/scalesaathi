import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/apiClient";
import { useAuth } from "../../auth/AuthContext";
import PageHeader from "../../components/PageHeader";
import "./Dashboard.css";

const failureGroups = [
  { label: "MPE exceeded", tests: ["weighing"] },
  { label: "Eccentricity", tests: ["eccentricity"] },
  { label: "Discrimination", tests: ["discrimination"] },
];

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function useDashboardData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    Promise.all([api.dashboardStats(), api.failureInsights()])
      .then(([stats, insights]) => { if (active) setData({ stats, insights }); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refresh]);

  return { data, loading, error, retry: () => setRefresh((value) => value + 1) };
}

function MetricCard({ label, value, to, icon }) {
  const card = <><span className={`metric-card__icon metric-card__icon--${icon}`} aria-hidden="true" />
    <span className="metric-card__label">{label}</span><strong>{value ?? "—"}</strong></>;
  return to ? <Link className={`metric-card metric-card--${icon}`} to={to}>{card}</Link> : <article className={`metric-card metric-card--${icon}`}>{card}</article>;
}

function ResultDistribution({ counts }) {
  const pass = counts?.pass || 0;
  const fail = counts?.fail || 0;
  const review = counts?.under_review || 0;
  const total = pass + fail + review;
  const passPct = total ? Math.round((pass / total) * 100) : 0;
  const failPct = total ? Math.round((fail / total) * 100) : 0;
  const reviewPct = total ? Math.max(0, 100 - passPct - failPct) : 0;
  const style = total ? { "--result-pie": `conic-gradient(#735530 0 ${passPct}%, #c99268 ${passPct}% ${passPct + failPct}%, #d8d6bd ${passPct + failPct}% 100%)` } : undefined;

  return <section className="dashboard-panel distribution-panel" aria-labelledby="distribution-title">
    <header className="dashboard-panel__header"><h2 id="distribution-title">Test Result Distribution</h2><span>Approved &amp; in review</span></header>
    {total ? <div className="distribution-content">
      <div className="result-donut" style={style} role="img" aria-label={`${pass} pass, ${fail} fail, ${review} under review`}><span><strong>{total}</strong><small>Sessions</small></span></div>
      <ul className="distribution-legend">
        <li><i className="legend-dot legend-dot--pass"/><span>Pass</span><strong>{pass}</strong><small>{passPct}%</small></li>
        <li><i className="legend-dot legend-dot--fail"/><span>Fail</span><strong>{fail}</strong><small>{failPct}%</small></li>
        <li><i className="legend-dot legend-dot--review"/><span>Under Review</span><strong>{review}</strong><small>{reviewPct}%</small></li>
      </ul>
    </div> : <p className="dashboard-empty">No approved results or sessions in review yet.</p>}
  </section>;
}

function FailureInsights({ insight }) {
  const failures = insight?.most_failed_tests || [];
  const countFor = (testNames) => failures.filter((item) => testNames.includes(String(item.test).toLowerCase())).reduce((sum, item) => sum + item.failures, 0);
  const namedTests = failureGroups.flatMap((group) => group.tests);
  const rows = [...failureGroups.map((group) => ({ label: group.label, count: countFor(group.tests) })), {
    label: "Other", count: failures.filter((item) => !namedTests.includes(String(item.test).toLowerCase())).reduce((sum, item) => sum + item.failures, 0),
  }];
  const max = Math.max(1, ...rows.map((row) => row.count));
  const hasData = rows.some((row) => row.count > 0);

  return <section className="dashboard-panel failure-panel" aria-labelledby="failure-title">
    <header className="dashboard-panel__header"><h2 id="failure-title">Failure Insights</h2><span>Recorded failed test results</span></header>
    {hasData ? <ul className="failure-list">{rows.map((row) => <li key={row.label}>
      <span className="failure-list__label">{row.label}</span><span className="failure-list__track"><i style={{ width: `${(row.count / max) * 100}%` }}/></span><strong>{row.count}</strong>
    </li>)}</ul> : <p className="dashboard-empty">No failed results recorded yet.</p>}
  </section>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error, retry } = useDashboardData();
  const greetingName = useMemo(() => {
    const name = (user?.full_name || "").replace(/^(Dr\.?|Mr\.?|Mrs\.?|Ms\.?|Prof\.?)\s*/i, "").trim();
    return name.split(/\s+/)[0] || "there";
  }, [user?.full_name]);
  const stats = data?.stats;
  const activities = stats?.recent_activity || [];

  const currentDate = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date());

  return <div className="dashboard-page">
    <PageHeader eyebrow="Overview" title="Overview" description={`Welcome back, ${greetingName}!`} />
    <div className="dashboard-date">{currentDate}</div>

    {error && <div className="dashboard-error" role="alert"><div><strong>Dashboard data is temporarily unavailable.</strong><span>Check that the ScaleSaathi service is running, then try again.</span></div><button type="button" onClick={retry}>Try again</button></div>}

    <section className="metric-grid" aria-label="ScaleSaathi overview metrics" aria-busy={loading}>
      <MetricCard label="Instruments" value={loading ? "…" : stats?.instruments} to="/app/instruments" icon="instrument" />
      <MetricCard label="Tests Completed" value={loading ? "…" : stats?.completed} to="/app/sessions" icon="complete" />
      <MetricCard label="Under Review" value={loading ? "…" : stats?.under_review} to={user?.role === "Reviewer" || user?.role === "Admin" ? "/app/review" : "/app/sessions"} icon="review" />
      <MetricCard label="Failed Tests" value={loading ? "…" : stats?.failed_tests} to="/app/sessions" icon="failed" />
    </section>

    {data && <div className="dashboard-panel-grid">
      <section className="dashboard-panel activity-panel" aria-labelledby="activity-title">
        <header className="dashboard-panel__header"><h2 id="activity-title">Recent Activity</h2><Link to="/app/history">View history <span aria-hidden="true">→</span></Link></header>
        {activities.length ? <ol className="activity-list">{activities.slice(0, 6).map((event, index) => <li key={`${event.at}-${index}`}>
          <span className="activity-mark" aria-hidden="true">{(event.user || "S").trim().charAt(0).toUpperCase()}</span>
          <div><p>{event.description || `${event.action} ${event.entity}`}</p><small>{[event.user, formatDate(event.at)].filter(Boolean).join(" · ")}</small></div>
        </li>)}</ol> : <p className="dashboard-empty">Activity will appear here as your lab registers instruments and completes tests.</p>}
      </section>
      <div className="dashboard-side-panels">
        <ResultDistribution counts={stats?.result_distribution} />
        <FailureInsights insight={data.insights} />
      </div>
    </div>}
    {loading && <div className="dashboard-loading" aria-live="polite"><span className="auth-spinner"/>Loading current lab data…</div>}
  </div>;
}
