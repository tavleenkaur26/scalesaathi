import { useEffect, useState } from "react";
import { api } from "../../api/apiClient";
import Container from "../../components/Container";
import PageHeader from "../../components/PageHeader";
import { Outcome } from "./TestResults";
import "./TestWorkflow.css";
import "./InstrumentPages.css";
import "./Repository.css";

const EMPTY_FILTERS = { search: "", manufacturer: "", model: "", status: "", verdict: "", date_from: "", date_to: "" };
const PAGE_SIZE = 25;
const statusTone = (value) => String(value || "").toLowerCase().replaceAll(" ", "-");
const dateOnly = (value) => (value ? new Date(value).toLocaleDateString() : "—");

// Strip blanks so we never send e.g. `date_from=` to the API — the backend
// treats an empty string as a value to parse, not as "no filter".
function cleanParams(filters, extra = {}) {
  const out = { ...extra };
  Object.entries(filters).forEach(([key, value]) => { if (value) out[key] = value; });
  return out;
}

export default function Repository() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ total: 0, items: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState(null);
  const [actionError, setActionError] = useState("");
  const [csvBusy, setCsvBusy] = useState(false);

  function load(currentFilters, currentPage) {
    setLoading(true);
    setError("");
    api.listReports(cleanParams(currentFilters, { page: currentPage, page_size: PAGE_SIZE }))
      .then((result) => setData(result))
      .catch((e) => setError(e.message || "The report repository could not be loaded."))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(appliedFilters, page); }, [page, appliedFilters]); // eslint-disable-line react-hooks/exhaustive-deps

  function onFilterChange(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function applyFilters(event) {
    event.preventDefault();
    setPage(1);
    setAppliedFilters(filters);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setPage(1);
    setAppliedFilters(EMPTY_FILTERS);
  }

  async function exportCsv() {
    setCsvBusy(true);
    setActionError("");
    try { await api.exportReportsCsv(cleanParams(appliedFilters)); }
    catch (e) { setActionError(e.message || "CSV export failed."); }
    finally { setCsvBusy(false); }
  }

  async function downloadReport(sessionId, format, reportNo) {
    const key = `${sessionId}-${format}`;
    setBusyKey(key);
    setActionError("");
    try {
      const filename = `${reportNo || `session-${sessionId}`}.${format}`;
      if (format === "pdf") await api.downloadReportPdf(sessionId, filename);
      else await api.downloadReportDocx(sessionId, filename);
    } catch (e) {
      setActionError(e.message || `Could not download the ${format.toUpperCase()}.`);
    } finally {
      setBusyKey(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const hasFilters = Object.values(appliedFilters).some(Boolean);

  return (
    <Container className="repository-page">
      <PageHeader eyebrow="Records" title="Repository" description="Search and manage ScaleSaathi test records." />

      <section className="workflow-card repository-card" aria-label="Report repository">
        <form className="repository-controls" onSubmit={applyFilters}>
          <label className="workflow-history-search repository-control repository-control--search">
            <span aria-hidden="true">⌕</span>
            <span className="visually-hidden">Search reports</span>
            <input type="search" value={filters.search} onChange={(e) => onFilterChange("search", e.target.value)}
                   placeholder="Search model, serial, manufacturer, report no…" />
          </label>
          <input className="repository-input repository-control" placeholder="Manufacturer" value={filters.manufacturer}
                 onChange={(e) => onFilterChange("manufacturer", e.target.value)} />
          <input className="repository-input repository-control" placeholder="Model" value={filters.model}
                 onChange={(e) => onFilterChange("model", e.target.value)} />
          <label className="workflow-history-filter repository-control">
            <span className="visually-hidden">Filter by status</span>
            <select value={filters.status} onChange={(e) => onFilterChange("status", e.target.value)}>
              <option value="">Any status</option>
              <option>Draft</option><option>Submitted</option><option>Under Review</option>
              <option>Approved</option><option>Returned</option>
            </select>
          </label>
          <label className="workflow-history-filter repository-control">
            <span className="visually-hidden">Filter by verdict</span>
            <select value={filters.verdict} onChange={(e) => onFilterChange("verdict", e.target.value)}>
              <option value="">Any verdict</option>
              <option value="PASS">PASS</option><option value="FAIL">FAIL</option>
            </select>
          </label>
          <label className="repository-date repository-control">
            <span className="visually-hidden">Tested from</span>
            <input type="date" value={filters.date_from} onChange={(e) => onFilterChange("date_from", e.target.value)} />
          </label>
          <label className="repository-date repository-control">
            <span className="visually-hidden">Tested to</span>
            <input type="date" value={filters.date_to} onChange={(e) => onFilterChange("date_to", e.target.value)} />
          </label>
          <div className="repository-control-actions">
            <button className="instrument-button instrument-button--primary instrument-button--small" type="submit">Search</button>
            <button className="instrument-button instrument-button--secondary instrument-button--small" type="button" onClick={clearFilters} disabled={!hasFilters}>Clear</button>
            <button className="instrument-button instrument-button--secondary instrument-button--small" type="button" onClick={exportCsv} disabled={csvBusy}>
              {csvBusy ? "Exporting…" : "Export CSV"}
            </button>
          </div>
        </form>

        {actionError && <div className="workflow-error repository-action-error" role="alert">{actionError}</div>}
        {error && <div className="workflow-error" role="alert">{error}</div>}

        {loading && <div className="instrument-state" role="status"><span className="instrument-spinner" />Loading reports…</div>}

        {!loading && !error && data.items.length === 0 && (
          <div className="instrument-empty">
            <span className="instrument-empty__mark" aria-hidden="true">⚖</span>
            <h2>No reports found</h2>
            <p>{hasFilters ? "No records match these filters." : "Approved and in-progress test sessions will appear here."}</p>
            {hasFilters && <button type="button" className="instrument-button instrument-button--secondary" onClick={clearFilters}>Clear filters</button>}
          </div>
        )}

        {!loading && !error && data.items.length > 0 && (
          <>
            <div className="workflow-table-wrap"><table className="workflow-table repository-table">
              <thead>
                <tr>
                  <th scope="col">Report</th>
                  <th scope="col">Instrument</th>
                  <th scope="col">Ruleset</th>
                  <th scope="col">Status</th>
                  <th scope="col">Verdict</th>
                  <th scope="col">Tested</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.session_id}>
                    <td><strong>{item.report_no || "Not yet issued"}</strong><small>Session #{item.session_id}</small></td>
                    <td><strong>{item.manufacturer} · {item.model}</strong><small>{item.serial_no} · Class {item.accuracy_class}</small></td>
                    <td>{item.ruleset_version || "—"}</td>
                    <td><span className={`workflow-history-status workflow-history-status--${statusTone(item.status)}`}>{item.status || "—"}</span></td>
                    <td>{item.verdict ? <Outcome value={item.verdict} /> : "—"}</td>
                    <td>{dateOnly(item.tested_at)}</td>
                    <td>
                      {item.status === "Approved" ? (
                        <div className="repository-row-actions">
                          <button type="button" className="instrument-link-button"
                                  disabled={busyKey === `${item.session_id}-pdf`}
                                  onClick={() => downloadReport(item.session_id, "pdf", item.report_no)}>
                            {busyKey === `${item.session_id}-pdf` ? "…" : "PDF"}
                          </button>
                          <button type="button" className="instrument-link-button"
                                  disabled={busyKey === `${item.session_id}-docx`}
                                  onClick={() => downloadReport(item.session_id, "docx", item.report_no)}>
                            {busyKey === `${item.session_id}-docx` ? "…" : "DOCX"}
                          </button>
                        </div>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>

            <div className="workflow-history-pagination">
              <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.total)} of {data.total} reports</span>
              <div>
                <button type="button" className="instrument-button instrument-button--secondary instrument-button--small"
                        disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
                <span aria-live="polite">{page} / {totalPages}</span>
                <button type="button" className="instrument-button instrument-button--secondary instrument-button--small"
                        disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            </div>
          </>
        )}
      </section>
    </Container>
  );
}