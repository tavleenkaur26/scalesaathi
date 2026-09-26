import { useEffect, useState } from "react";
import { api } from "./api";
import "./p4.css";

const EMPTY_FILTERS = { search: "", manufacturer: "", model: "", status: "", verdict: "", date_from: "", date_to: "" };
const PAGE_SIZE = 25;

export default function Repository() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [data, setData] = useState({ total: 0, items: [] });
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  function load(currentFilters = filters, currentPage = page) {
    setBusy(true);
    setError(null);
    api.searchReports(currentFilters, currentPage, PAGE_SIZE)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  }

  useEffect(() => { load(filters, page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  function onFilterChange(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  function applyFilters(e) {
    e.preventDefault();
    setPage(1);
    load(filters, 1);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setPage(1);
    load(EMPTY_FILTERS, 1);
  }

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <div className="p4-page">
      <h1>Report repository</h1>

      <form className="p4-filters" onSubmit={applyFilters}>
        <input placeholder="Search model / serial / manufacturer / report no."
               value={filters.search} onChange={(e) => onFilterChange("search", e.target.value)}
               style={{ minWidth: 260 }} />
        <input placeholder="Manufacturer" value={filters.manufacturer}
               onChange={(e) => onFilterChange("manufacturer", e.target.value)} />
        <input placeholder="Model" value={filters.model}
               onChange={(e) => onFilterChange("model", e.target.value)} />
        <select value={filters.status} onChange={(e) => onFilterChange("status", e.target.value)}>
          <option value="">Any status</option>
          <option>Draft</option><option>Submitted</option><option>Under Review</option>
          <option>Approved</option><option>Returned</option>
        </select>
        <select value={filters.verdict} onChange={(e) => onFilterChange("verdict", e.target.value)}>
          <option value="">Any verdict</option>
          <option value="PASS">PASS</option><option value="FAIL">FAIL</option>
        </select>
        <input type="date" value={filters.date_from} onChange={(e) => onFilterChange("date_from", e.target.value)} />
        <input type="date" value={filters.date_to} onChange={(e) => onFilterChange("date_to", e.target.value)} />
        <button className="p4-btn" type="submit">Search</button>
        <button className="p4-btn secondary" type="button" onClick={clearFilters}>Clear</button>
        <button className="p4-btn secondary" type="button"
                onClick={() => api.downloadFile(api.exportCsvPath(filters), "scalesaathi_reports.csv")}>
          Export CSV
        </button>
      </form>

      {error && <p className="p4-error">{error}</p>}

      {busy ? (
        <p className="p4-empty">Loading…</p>
      ) : data.items.length === 0 ? (
        <p className="p4-empty">No reports match these filters.</p>
      ) : (
        <>
          <table className="p4-table">
            <thead>
              <tr>
                <th>Report no.</th><th>Manufacturer</th><th>Model</th><th>Serial</th><th>Class</th>
                <th>Status</th><th>Verdict</th><th>Tested</th><th>Approved by</th><th></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((r) => (
                <tr key={r.session_id}>
                  <td>{r.report_no || "—"}</td>
                  <td>{r.manufacturer}</td>
                  <td>{r.model}</td>
                  <td>{r.serial_no}</td>
                  <td>{r.accuracy_class}</td>
                  <td><span className="p4-badge status">{r.status}</span></td>
                  <td>{r.verdict ? <span className={`p4-badge ${r.verdict}`}>{r.verdict}</span> : "—"}</td>
                  <td>{r.tested_at}</td>
                  <td>{r.approved_by || "—"}</td>
                  <td>
                    {r.status === "Approved" && (
                      <>
                        <button className="p4-link-btn"
                                onClick={() => api.downloadFile(api.reportPdfPath(r.session_id), `${r.report_no}.pdf`)}>
                          PDF
                        </button>
                        <button className="p4-link-btn"
                                onClick={() => api.downloadFile(api.reportDocxPath(r.session_id), `${r.report_no}.docx`)}>
                          Word
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="p4-pagination">
            <button className="p4-btn secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <span>Page {page} of {totalPages} ({data.total} total)</span>
            <button className="p4-btn secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </>
      )}
    </div>
  );
}
