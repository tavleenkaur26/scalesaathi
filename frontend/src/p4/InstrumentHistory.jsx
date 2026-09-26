import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom"; // remove if P3 isn't using react-router-dom
import { api } from "./api";
import "./p4.css";

export default function InstrumentHistory() {
  const { id } = useParams();
  const [instrument, setInstrument] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.instrument(id).then(setInstrument).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="p4-page"><p className="p4-error">{error}</p></div>;
  if (!instrument) return <div className="p4-page">Loading…</div>;

  return (
    <div className="p4-page">
      <h1>{instrument.model} — {instrument.serial_no}</h1>
      <p style={{ color: "#666" }}>Class {instrument.accuracy_class} · Max {instrument.max_capacity} g · e {instrument.e} g</p>

      <h2>Test history</h2>
      {instrument.history.length === 0 ? (
        <p className="p4-empty">No sessions recorded yet for this instrument.</p>
      ) : (
        <table className="p4-table">
          <thead><tr><th>Session</th><th>Tested</th><th>Status</th><th>Verdict</th><th>Report</th></tr></thead>
          <tbody>
            {instrument.history.map((h) => (
              <tr key={h.session_id}>
                <td>#{h.session_id}</td>
                <td>{h.tested_at}</td>
                <td><span className="p4-badge status">{h.status}</span></td>
                <td>{h.verdict ? <span className={`p4-badge ${h.verdict}`}>{h.verdict}</span> : "—"}</td>
                <td>
                  {h.report_no ? (
                    <>
                      <button className="p4-link-btn"
                              onClick={() => api.downloadFile(api.reportPdfPath(h.session_id), `${h.report_no}.pdf`)}>
                        PDF
                      </button>
                      <button className="p4-link-btn"
                              onClick={() => api.downloadFile(api.reportDocxPath(h.session_id), `${h.report_no}.docx`)}>
                        Word
                      </button>
                    </>
                  ) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p style={{ marginTop: "1.5rem" }}><Link to="/reports">&larr; Back to repository</Link></p>
    </div>
  );
}
