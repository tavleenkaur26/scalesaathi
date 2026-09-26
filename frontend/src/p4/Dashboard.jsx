import { useEffect, useState } from "react";
import { api } from "./api";
import "./p4.css";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.dashboardStats(), api.failureInsights()])
      .then(([s, i]) => {
        setStats(s);
        setInsights(i);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="p4-page"><p className="p4-error">Couldn't load the dashboard: {error}</p></div>;
  if (!stats || !insights) return <div className="p4-page">Loading dashboard…</div>;

  const maxFail = Math.max(1, ...insights.most_failed_tests.map((t) => t.total));

  return (
    <div className="p4-page">
      <h1>Dashboard</h1>

      <div className="p4-stats">
        <StatCard num={stats.completed} label="Completed" />
        <StatCard num={stats.in_progress} label="In progress" />
        <StatCard num={stats.under_review} label="Under review" />
        <StatCard num={stats.total} label="Total sessions" />
      </div>

      <h2>Recent activity</h2>
      {stats.recent_activity.length === 0 ? (
        <p className="p4-empty">Nothing yet.</p>
      ) : (
        <ul className="p4-activity">
          {stats.recent_activity.map((e, idx) => (
            <li key={idx}>
              <strong>{e.user || "System"}</strong> {e.description || `${e.action} ${e.entity}`}
              <div className="when">{e.at}</div>
            </li>
          ))}
        </ul>
      )}

      <h2>Most-failed tests</h2>
      {insights.most_failed_tests.length === 0 ? (
        <p className="p4-empty">No failures recorded yet.</p>
      ) : (
        insights.most_failed_tests.map((t) => (
          <div className="p4-bar-row" key={t.test}>
            <div className="p4-bar-label">{t.test}</div>
            <div className="p4-bar-track">
              <div className="p4-bar-fill fail" style={{ width: `${(t.failures / maxFail) * 100}%` }} />
            </div>
            <div className="p4-bar-value">{t.failures}/{t.total}</div>
          </div>
        ))
      )}

      <h2>Failure rate by manufacturer</h2>
      {insights.failure_rate_by_manufacturer.length === 0 ? (
        <p className="p4-empty">No data yet.</p>
      ) : (
        insights.failure_rate_by_manufacturer.map((m) => (
          <div className="p4-bar-row" key={m.manufacturer}>
            <div className="p4-bar-label">{m.manufacturer}</div>
            <div className="p4-bar-track">
              <div className="p4-bar-fill fail" style={{ width: `${m.rate * 100}%` }} />
            </div>
            <div className="p4-bar-value">{Math.round(m.rate * 100)}%</div>
          </div>
        ))
      )}

      <h2>Repeat-failing models</h2>
      {insights.repeat_failing_models.filter((m) => m.repeat).length === 0 ? (
        <p className="p4-empty">No model has failed more than once.</p>
      ) : (
        <table className="p4-table">
          <thead><tr><th>Manufacturer</th><th>Model</th><th>Failed sessions</th><th>Total sessions</th></tr></thead>
          <tbody>
            {insights.repeat_failing_models.filter((m) => m.repeat).map((m) => (
              <tr key={`${m.manufacturer}-${m.model}`}>
                <td>{m.manufacturer}</td><td>{m.model}</td>
                <td>{m.failed_sessions}</td><td>{m.sessions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function StatCard({ num, label }) {
  return (
    <div className="p4-stat-card">
      <div className="num">{num}</div>
      <div className="label">{label}</div>
    </div>
  );
}
