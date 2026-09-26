import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api } from "../../api/apiClient";
import PageHeader from "../../components/PageHeader";
import scale from "../../assets/hero/scale2.png";
import "./InstrumentPages.css";

function mass(value) {
  return value == null ? "—" : `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 })} g`;
}

export default function InstrumentDetails() {
  const { instrumentId } = useParams();
  const location = useLocation();
  const [instrument, setInstrument] = useState(null);
  const [validation, setValidation] = useState({ status: "loading", data: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setValidation({ status: "loading", data: null });
    api.getInstrument(instrumentId)
      .then(async (item) => {
        if (!active) return;
        setInstrument(item);
        try {
          const check = await api.validateSpec({ max_capacity: item.max_capacity, min_capacity: item.min_capacity, e: item.e, accuracy_class: item.accuracy_class });
          if (active) setValidation({ status: check.valid ? "valid" : "invalid", data: check });
        } catch {
          if (active) setValidation({ status: "error", data: null });
        }
      })
      .catch((cause) => { if (active) setError(cause.status === 404 ? "This instrument could not be found." : "We couldn’t load this instrument. Check your connection and try again."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [instrumentId]);

  if (loading) return <div className="instrument-page"><div className="instrument-state" role="status"><span className="instrument-spinner"/>Loading instrument details…</div></div>;
  if (error || !instrument) return <div className="instrument-page"><div className="instrument-breadcrumb"><Link to="/app/instruments">Instruments</Link><span aria-hidden="true">›</span><span>Instrument Details</span></div><div className="instrument-state instrument-state--error" role="alert"><p>{error || "Instrument details are unavailable."}</p><Link className="instrument-button instrument-button--secondary" to="/app/instruments">Back to Instruments</Link></div></div>;

  const validationPassed = validation.status === "valid";
  const band = validation.data?.matched_band;
  const newlyRegistered = Boolean(location.state?.newlyRegistered);

  return <div className="instrument-page">
    <div className="instrument-breadcrumb"><Link to="/app/instruments">Instruments</Link><span aria-hidden="true">›</span><span>Instrument Details</span></div>
    {newlyRegistered && <p className="instrument-success-message" role="status"><span aria-hidden="true">✓</span> Instrument registered successfully.</p>}
    <PageHeader eyebrow="Instrument record" title="Instrument Details" description="Registration specifications and current validation status." actions={<span className="instrument-status"><span aria-hidden="true">✓</span> Registered</span>} />

    <div className="instrument-detail-layout">
      <section className="instrument-detail-card" aria-labelledby="instrument-record-title">
        <div className="instrument-detail-hero">
          <div className="instrument-detail-hero__image"><img src={scale} alt="Precision weighing instrument" /></div>
          <div className="instrument-detail-hero__title"><p className="instrument-eyebrow">{instrument.manufacturer}</p><h2 id="instrument-record-title">{instrument.model}</h2><p>Serial Number · {instrument.serial_no}</p><span className="instrument-status">Registered</span></div>
        </div>
        <div className="instrument-detail-content"><dl className="instrument-spec-grid">
          <div><dt>Manufacturer</dt><dd>{instrument.manufacturer}</dd></div>
          <div><dt>Model</dt><dd>{instrument.model}</dd></div>
          <div><dt>Serial Number</dt><dd>{instrument.serial_no}</dd></div>
          <div><dt>Accuracy Class</dt><dd>{instrument.accuracy_class}</dd></div>
          <div><dt>Max</dt><dd>{mass(instrument.max_capacity)}</dd></div>
          <div><dt>Min</dt><dd>{mass(instrument.min_capacity)}</dd></div>
          <div><dt>e (Verification Scale Interval)</dt><dd>{mass(instrument.e)}</dd></div>
          <div><dt>Actual Scale Interval (d)</dt><dd>{mass(instrument.d ?? instrument.e)}</dd></div>
        </dl></div>
      </section>

      <section className="instrument-detail-validation" aria-labelledby="detail-validation-title" aria-live="polite">
        <h2 id="detail-validation-title">Specification Check</h2>
        {validation.status === "loading" && <div className="instrument-state"><span className="instrument-spinner"/>Checking current ruleset…</div>}
        {validation.status === "valid" && <div className="instrument-detail-validation__status"><span aria-hidden="true">✓</span><strong>Specifications Valid</strong></div>}
        {validation.status === "invalid" && <div className="instrument-detail-validation__status instrument-detail-validation__status--error"><span aria-hidden="true">!</span><strong>Specifications need correction</strong></div>}
        {validation.status === "error" && <div className="instrument-detail-validation__status instrument-detail-validation__status--error"><span aria-hidden="true">!</span><strong>Current validation unavailable</strong></div>}
        {validation.data && <ul>{validation.data.issues.map((issue, index) => <li key={`${issue.field}-${index}`}>{issue.message}{issue.clause && issue.clause !== "-" && <small> · {issue.clause}</small>}</li>)}</ul>}
        {validationPassed && band && <ul className="instrument-detail-validation__facts"><li>n = {Number(validation.data.n).toLocaleString()} (Max / e)</li><li>Matched Accuracy Class band: n {band.n_min}–{band.n_max ?? "∞"}</li></ul>}
        <p className="spec-check-note">Model support is not checked by the specification rules endpoint.</p>
      </section>
    </div>

    <section className="instrument-detail-next" aria-label="Next workflow step">
      <div><h2>Ready for the next step</h2><p>The registered specifications are available for test plan generation.</p></div>
      <Link className="instrument-button instrument-button--primary" to={`/app/instruments/${instrumentId}/test-plan`}>Generate Test Plan <span aria-hidden="true">→</span></Link>
    </section>
  </div>;
}
