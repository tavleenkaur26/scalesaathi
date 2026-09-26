import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api/apiClient";
import Container from "../../components/Container";
import PageHeader from "../../components/PageHeader";
import { Outcome, mass, pct, testName } from "./TestResults";
import "./TestWorkflow.css";
import "./InstrumentPages.css";
import "./Reports.css";

const PAGE_SIZE = 25;
const dateOnly = (value) => (value ? new Date(value).toLocaleDateString() : "—");
const dateTime = (value) => (value ? new Date(value).toLocaleString() : "—");

export default function Reports() {
  const { sessionId } = useParams();
  return sessionId ? <ReportDetail sessionId={sessionId} /> : <ReportsList />;
}

// ---------------------------------------------------------------- list

function ReportsList() {
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ total: 0, items: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState(null);
  const [actionError, setActionError] = useState("");

  function load(currentSearch, currentPage) {
    setLoading(true);
    setError("");

    const params = {
      status: "Approved",
      page: currentPage,
      page_size: PAGE_SIZE,
    };

    if (currentSearch) params.search = currentSearch;

    api.listReports(params)
      .then((result) => setData(result))
      .catch((e) => setError(e.message || "Approved reports could not be loaded."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(appliedSearch, page);
  }, [page, appliedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  function onSearchSubmit(event) {
    event.preventDefault();
    setPage(1);
    setAppliedSearch(search);
  }

  async function downloadReport(sessionId, format, reportNo) {
    const key = `${sessionId}-${format}`;
    setBusyKey(key);
    setActionError("");

    try {
      const filename = `${reportNo || `session-${sessionId}`}.${format}`;

      if (format === "pdf") {
        await api.downloadReportPdf(sessionId, filename);
      } else {
        await api.downloadReportDocx(sessionId, filename);
      }
    } catch (e) {
      setActionError(
        e.message || `Could not download the ${format.toUpperCase()}.`
      );
    } finally {
      setBusyKey(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <Container className="reports-page">
      <PageHeader
        eyebrow="Records"
        title="Reports"
        description="Approved reports and their verification/download details."
      />

      <section
        className="workflow-card reports-card"
        aria-label="Approved reports"
      >
        <form className="reports-search" onSubmit={onSearchSubmit}>
          <label className="workflow-history-search reports-search__field">
            <span aria-hidden="true">⌕</span>
            <span className="visually-hidden">Search reports</span>

            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search model, serial, manufacturer, report no..."
            />
          </label>

          <button
            className="instrument-button instrument-button--primary instrument-button--small"
            type="submit"
          >
            Search
          </button>

          {appliedSearch && (
            <button
              type="button"
              className="instrument-button instrument-button--secondary instrument-button--small"
              onClick={() => {
                setSearch("");
                setAppliedSearch("");
                setPage(1);
              }}
            >
              Clear
            </button>
          )}
        </form>

        {actionError && (
          <div
            className="workflow-error reports-action-error"
            role="alert"
          >
            {actionError}
          </div>
        )}

        {error && (
          <div className="workflow-error" role="alert">
            {error}
          </div>
        )}

        {loading && (
          <div className="instrument-state" role="status">
            <span className="instrument-spinner" />
            Loading reports...
          </div>
        )}

        {!loading && !error && data.items.length === 0 && (
          <div className="instrument-empty">
            <span className="instrument-empty__mark" aria-hidden="true">
              ⚖
            </span>

            <h2>No approved reports yet</h2>

            <p>
              {appliedSearch
                ? "No approved reports match this search."
                : "Once a reviewer approves a test session, its report will appear here."}
            </p>

            {appliedSearch && (
              <button
                type="button"
                className="instrument-button instrument-button--secondary"
                onClick={() => {
                  setSearch("");
                  setAppliedSearch("");
                  setPage(1);
                }}
              >
                Clear search
              </button>
            )}
          </div>
        )}

        {!loading && !error && data.items.length > 0 && (
          <>
            <div className="workflow-table-wrap">
              <table className="workflow-table reports-table">
                <thead>
                  <tr>
                    <th scope="col">Report</th>
                    <th scope="col">Instrument</th>
                    <th scope="col">Ruleset</th>
                    <th scope="col">Verdict</th>
                    <th scope="col">Tested</th>
                    <th scope="col">Approved</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.session_id}>
                      <td>
                        <strong>{item.report_no || "Not yet issued"}</strong>
                        <small>Session #{item.session_id}</small>
                      </td>

                      <td>
                        <strong>
                          {item.manufacturer} · {item.model}
                        </strong>

                        <small>
                          {item.serial_no || "Serial n/a"} · Class{" "}
                          {item.accuracy_class}
                        </small>
                      </td>

                      <td>{item.ruleset_version || "—"}</td>

                      <td>
                        {item.verdict ? (
                          <Outcome value={item.verdict} />
                        ) : (
                          "—"
                        )}
                      </td>

                      <td>{dateOnly(item.tested_at)}</td>

                      <td>{dateOnly(item.approved_at)}</td>

                      <td>
                        <div className="reports-row-actions">
                          <Link
                            className="instrument-link-button"
                            to={`/app/reports/${item.session_id}`}
                          >
                            View
                          </Link>

                          <button
                            type="button"
                            className="instrument-link-button"
                            disabled={
                              busyKey === `${item.session_id}-pdf`
                            }
                            onClick={() =>
                              downloadReport(
                                item.session_id,
                                "pdf",
                                item.report_no
                              )
                            }
                          >
                            {busyKey === `${item.session_id}-pdf`
                              ? "..."
                              : "PDF"}
                          </button>

                          <button
                            type="button"
                            className="instrument-link-button"
                            disabled={
                              busyKey === `${item.session_id}-docx`
                            }
                            onClick={() =>
                              downloadReport(
                                item.session_id,
                                "docx",
                                item.report_no
                              )
                            }
                          >
                            {busyKey === `${item.session_id}-docx`
                              ? "..."
                              : "DOCX"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="workflow-history-pagination">
              <span>
                Showing {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, data.total)} of {data.total}{" "}
                reports
              </span>

              <div>
                <button
                  type="button"
                  className="instrument-button instrument-button--secondary instrument-button--small"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Prev
                </button>

                <span aria-live="polite">
                  {page} / {totalPages}
                </span>

                <button
                  type="button"
                  className="instrument-button instrument-button--secondary instrument-button--small"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </Container>
  );
}

// ---------------------------------------------------------------- detail

function ReportDetail({ sessionId }) {
  const [ctx, setCtx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    api.getReportContext(sessionId)
      .then((data) => {
        if (active) setCtx(data);
      })
      .catch((e) => {
        if (!active) return;

        if (e.status === 409) {
          setError(
            "This session hasn't been approved yet, so no report exists for it."
          );
        } else if (e.status === 404) {
          setError("This report could not be found.");
        } else {
          setError(e.message || "This report could not be loaded.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [sessionId]);

  async function download(format) {
    setBusyKey(format);
    setActionError("");

    try {
      const filename = `${
        ctx?.report?.report_no || `session-${sessionId}`
      }.${format}`;

      if (format === "pdf") {
        await api.downloadReportPdf(sessionId, filename);
      } else {
        await api.downloadReportDocx(sessionId, filename);
      }
    } catch (e) {
      setActionError(
        e.message || `Could not download the ${format.toUpperCase()}.`
      );
    } finally {
      setBusyKey(null);
    }
  }

  if (loading) {
    return (
      <Container className="reports-page">
        <div className="instrument-state" role="status">
          <span className="instrument-spinner" />
          Loading report...
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="reports-page">
        <div className="instrument-breadcrumb">
          <Link to="/app/reports">Reports</Link>
          <span aria-hidden="true">›</span>
          <span>Session {sessionId}</span>
        </div>

        <div className="workflow-error" role="alert">
          {error}
        </div>

        <Link
          className="instrument-button instrument-button--secondary"
          to="/app/reports"
        >
          Back to Reports
        </Link>
      </Container>
    );
  }

  const {
    report,
    instrument,
    manufacturer,
    tester,
    approved_by,
    lab,
    session,
    verdict,
    results,
  } = ctx;

  return (
    <Container className="reports-page reports-detail">
      <div className="instrument-breadcrumb">
        <Link to="/app/reports">Reports</Link>

        <span aria-hidden="true">›</span>

        <span>
          {report.report_no || `Session ${sessionId}`}
        </span>
      </div>

      <header className="workflow-session-heading workflow-results-heading">
        <div>
          <p className="instrument-eyebrow">
            Report · {report.ruleset_version || "Ruleset unavailable"}
          </p>

          <h1>
            {report.report_no || `Session ${sessionId}`}
          </h1>

          <p>
            {manufacturer.name} · {instrument.model} · Serial No.{" "}
            {instrument.serial_no || "n/a"}
          </p>
        </div>

        <div className="workflow-results-status">
          <span
            className={`workflow-result-badge workflow-result-badge--${String(
              report.overall_verdict || ""
            ).toLowerCase()}`}
          >
            {report.overall_verdict || "—"}
          </span>

          <span className="workflow-draft-badge">
            Approved
          </span>
        </div>
      </header>

      {actionError && (
        <div className="workflow-error" role="alert">
          {actionError}
        </div>
      )}

      <section
        className="workflow-card reports-info-card"
        aria-labelledby="report-info-title"
      >
        <h2 id="report-info-title">Report Information</h2>

        <dl className="reports-info-grid">
          <div>
            <dt>Report No.</dt>
            <dd>{report.report_no || "—"}</dd>
          </div>

          <div>
            <dt>Status</dt>
            <dd>Approved</dd>
          </div>

          <div>
            <dt>Verdict</dt>
            <dd>
              <Outcome value={report.overall_verdict} />
            </dd>
          </div>

          <div>
            <dt>Ruleset Version</dt>
            <dd>{report.ruleset_version || "—"}</dd>
          </div>

          <div>
            <dt>Report Hash</dt>
            <dd className="reports-hash">
              {report.hash || "—"}
            </dd>
          </div>

          <div>
            <dt>Test Date</dt>
            <dd>{dateTime(session.tested_at)}</dd>
          </div>

          <div>
            <dt>Approved Date</dt>
            <dd>{dateTime(report.approved_at)}</dd>
          </div>
        </dl>
      </section>

      <section
        className="workflow-card reports-info-card"
        aria-labelledby="report-instrument-title"
      >
        <h2 id="report-instrument-title">Instrument</h2>

        <dl className="reports-info-grid">
          <div>
            <dt>Manufacturer</dt>
            <dd>{manufacturer.name || "—"}</dd>
          </div>

          <div>
            <dt>Model</dt>
            <dd>{instrument.model || "—"}</dd>
          </div>

          <div>
            <dt>Serial Number</dt>
            <dd>{instrument.serial_no || "—"}</dd>
          </div>

          <div>
            <dt>Accuracy Class</dt>
            <dd>{instrument.accuracy_class || "—"}</dd>
          </div>

          <div>
            <dt>Max</dt>
            <dd>{mass(instrument.max_capacity)}</dd>
          </div>

          <div>
            <dt>Min</dt>
            <dd>{mass(instrument.min_capacity)}</dd>
          </div>

          <div>
            <dt>e</dt>
            <dd>{mass(instrument.e)}</dd>
          </div>
        </dl>
      </section>

      <section
        className="workflow-card reports-info-card"
        aria-labelledby="report-people-title"
      >
        <h2 id="report-people-title">People / Workflow</h2>

        <dl className="reports-info-grid">
          <div>
            <dt>Tester</dt>
            <dd>
              {tester?.full_name || "—"}
              {tester?.designation ? (
                <small> · {tester.designation}</small>
              ) : null}
            </dd>
          </div>

          <div>
            <dt>Reviewer</dt>
            <dd>
              {approved_by?.full_name || "—"}
              {approved_by?.designation ? (
                <small> · {approved_by.designation}</small>
              ) : null}
            </dd>
          </div>

          <div>
            <dt>Approved</dt>
            <dd>{dateTime(report.approved_at)}</dd>
          </div>

          {lab?.name && (
            <div>
              <dt>Lab</dt>
              <dd>{lab.name}</dd>
            </div>
          )}
        </dl>
      </section>

      <section
        className="workflow-card reports-results-card"
        aria-labelledby="report-results-title"
      >
        <div className="workflow-section-heading">
          <div>
            <h2 id="report-results-title">Test Summary</h2>

            <p>
              Test-wise results as returned by the evaluation engine for this
              approved session.
            </p>
          </div>

          <span>
            {results?.length || 0} result
            {results?.length === 1 ? "" : "s"}
          </span>
        </div>

        {results?.length ? (
          <div className="workflow-table-wrap">
            <table className="workflow-table workflow-results-table">
              <thead>
                <tr>
                  <th scope="col">Test</th>
                  <th scope="col">Load</th>
                  <th scope="col">MPE</th>
                  <th scope="col">Error</th>
                  <th scope="col">Utilisation</th>
                  <th scope="col">Result</th>
                </tr>
              </thead>

              <tbody>
                {results.map((row, i) => (
                  <tr
                    key={`${row.test}-${row.label || ""}-${i}`}
                  >
                    <td>
                      {testName(row.test)}
                      {row.label ? (
                        <small>{row.label}</small>
                      ) : null}
                    </td>

                    <td>{mass(row.load)}</td>

                    <td>
                      {row.mpe == null
                        ? "—"
                        : `± ${mass(Math.abs(Number(row.mpe)))}`}
                    </td>

                    <td>{mass(row.error)}</td>

                    <td>{pct(row.utilisation)}</td>

                    <td>
                      <Outcome value={row.result} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="workflow-empty-results">
            The engine returned no individual result rows for this report.
          </p>
        )}

        {verdict?.warnings?.length > 0 && (
          <ul className="reports-warnings">
            {verdict.warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        )}
      </section>

      <div className="workflow-actions reports-detail-actions">
        <button
          type="button"
          className="instrument-button instrument-button--primary"
          disabled={busyKey === "pdf"}
          onClick={() => download("pdf")}
        >
          {busyKey === "pdf" ? "Preparing..." : "Download PDF"}
        </button>

        <button
          type="button"
          className="instrument-button instrument-button--secondary"
          disabled={busyKey === "docx"}
          onClick={() => download("docx")}
        >
          {busyKey === "docx" ? "Preparing..." : "Download DOCX"}
        </button>

        {report.verify_url && (
          <a
            className="instrument-button instrument-button--secondary"
            href={report.verify_url}
            target="_blank"
            rel="noreferrer"
          >
            Verify Report
          </a>
        )}

        <span className="workflow-actions__spacer" />

        <Link
          className="instrument-link-button"
          to="/app/reports"
        >
          Back to Reports
        </Link>
      </div>
    </Container>
  );
}