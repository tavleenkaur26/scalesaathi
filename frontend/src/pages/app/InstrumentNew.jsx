import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api/apiClient";
import PageHeader from "../../components/PageHeader";
import "./InstrumentPages.css";

const emptyForm = { manufacturer_id: "", model: "", serial_no: "", max_capacity: "", min_capacity: "", e: "", accuracy_class: "" };
const fieldNames = { max_capacity: "Max", min_capacity: "Min", e: "e", accuracy_class: "Accuracy Class", d: "d" };

function friendlyError(error) {
  if (error.status === 409) return error.message || "This instrument is already registered. Check the manufacturer, model and serial number.";
  if (error.status === 404) return "That manufacturer could not be found. Refresh the manufacturer list and try again.";
  if (error.status === 403) return "Your account does not have permission to register an instrument.";
  if (!error.status || error.status >= 500) return "We couldn’t reach the ScaleSaathi service. Check your connection and try again.";
  return error.message || "We couldn’t save this instrument. Please review the entered details.";
}

function buildSpec(form) {
  return {
    max_capacity: Number(form.max_capacity),
    min_capacity: Number(form.min_capacity),
    e: Number(form.e),
    accuracy_class: form.accuracy_class,
  };
}

function clientSpecIssue(form) {
  const max = Number(form.max_capacity);
  const min = Number(form.min_capacity);
  const interval = Number(form.e);
  if (!form.max_capacity || !form.min_capacity || !form.e || !form.accuracy_class) return "";
  if (![max, min, interval].every(Number.isFinite)) return "Enter numeric values for Max, Min and e.";
  if (max <= 0) return "Max must be greater than 0 g.";
  if (min <= 0) return "Min must be greater than 0 g.";
  if (interval <= 0) return "e must be greater than 0 g.";
  if (max <= min) return "Max must be greater than Min.";
  return "";
}

function ValidationPanel({ validation, form, specIssue }) {
  const result = validation.data;
  const band = result?.matched_band;
  const status = validation.status;
  const requiredFieldsReady = form.max_capacity && form.min_capacity && form.e && form.accuracy_class;

  return <aside className="spec-check-panel" aria-labelledby="spec-check-title" aria-live="polite">
    <div className="spec-check-panel__heading"><div><p className="instrument-eyebrow">Live validation</p><h2 id="spec-check-title">Specification Check</h2></div>{(status === "loading" || status === "waiting") && <span className="instrument-spinner" aria-label="Validating"/>}</div>
    {!requiredFieldsReady && status !== "input-error" && <div className="spec-check-neutral"><span className="spec-check-neutral__icon" aria-hidden="true">▤</span><p>Enter instrument specifications to validate.</p><small>The active ruleset checks Max, Min, e and Accuracy Class.</small></div>}
    {requiredFieldsReady && (status === "waiting" || status === "loading") && <div className="spec-check-status spec-check-status--pending"><span className="instrument-spinner"/><span>{status === "waiting" ? "Waiting for input…" : "Validating against the active ruleset…"}</span></div>}
    {status === "input-error" && <div className="spec-check-status spec-check-status--invalid"><strong>Check the entered values</strong><p>{specIssue}</p></div>}
    {status === "error" && <div className="spec-check-status spec-check-status--error"><strong>Validation is unavailable</strong><p>{validation.message}</p><small>Your entries are saved in this form. Try validation again before saving.</small><button className="instrument-link-button" type="button" onClick={validation.retry}>Retry validation</button></div>}
    {status === "valid" && result && <>
      <div className="spec-check-summary spec-check-summary--valid"><span className="spec-check-symbol" aria-hidden="true">✓</span><div><strong>Specifications Valid</strong><small>Checked by the active backend ruleset</small></div></div>
      <ul className="spec-check-results">
        <li><span>Max / e intervals</span><strong>n = {Number(result.n).toLocaleString()}</strong></li>
        <li><span>Accuracy Class {form.accuracy_class}</span><strong>Compliant</strong></li>
        {band && <li className="spec-check-results__detail"><span>Matched band</span><small>n {band.n_min}–{band.n_max ?? "∞"} · e {band.e_min}–{band.e_max ?? "∞"} g</small></li>}
        {band && <li className="spec-check-results__detail"><span>Minimum capacity threshold</span><small>{Number(band.min_capacity_e) * Number(form.e)} g ({band.min_capacity_e}e)</small></li>}
      </ul>
    </>}
    {status === "invalid" && result && <>
      <div className="spec-check-summary spec-check-summary--invalid"><span className="spec-check-symbol" aria-hidden="true">!</span><div><strong>Specifications need correction</strong><small>Resolve the engine checks below before saving.</small></div></div>
      <ul className="spec-issues">{result.issues.filter((issue) => issue.severity === "error").map((issue, index) => <li key={`${issue.field}-${index}`}><strong>{fieldNames[issue.field] || issue.field.replaceAll("_", " ")}</strong><span>{issue.message}</span><small>{issue.clause}</small></li>)}</ul>
    </>}
    {result?.issues.some((issue) => issue.severity === "warning") && <ul className="spec-issues spec-issues--warnings">{result.issues.filter((issue) => issue.severity === "warning").map((issue, index) => <li key={`warning-${issue.field}-${index}`}><strong>{fieldNames[issue.field] || issue.field}</strong><span>{issue.message}</span></li>)}</ul>}
    <p className="spec-check-note">Model name is recorded as supplied; the specification endpoint does not check a supported-model catalogue.</p>
  </aside>;
}

export default function InstrumentNew() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [manufacturers, setManufacturers] = useState([]);
  const [makerLoading, setMakerLoading] = useState(true);
  const [makerError, setMakerError] = useState("");
  const [makerRetry, setMakerRetry] = useState(0);
  const [addManufacturer, setAddManufacturer] = useState(false);
  const [newManufacturerName, setNewManufacturerName] = useState("");
  const [makerSaving, setMakerSaving] = useState(false);
  const [makerMessage, setMakerMessage] = useState("");
  const [sampleLoading, setSampleLoading] = useState(false);
  const [sampleMessage, setSampleMessage] = useState("");
  const [sampleError, setSampleError] = useState("");
  const [validation, setValidation] = useState({ status: "idle", data: null, message: "" });
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [localErrors, setLocalErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saveIssues, setSaveIssues] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setMakerLoading(true);
    setMakerError("");
    api.listManufacturers()
      .then((items) => { if (active) setManufacturers(items); })
      .catch(() => { if (active) setMakerError("We couldn’t load manufacturers. Try again or add a manufacturer below."); })
      .finally(() => { if (active) setMakerLoading(false); });
    return () => { active = false; };
  }, [makerRetry]);

  const specIssue = useMemo(() => clientSpecIssue(form), [form]);
  const specReady = Boolean(form.max_capacity && form.min_capacity && form.e && form.accuracy_class);
  const specKey = useMemo(() => specReady && !specIssue ? JSON.stringify(buildSpec(form)) : "", [form, specReady, specIssue]);

  useEffect(() => {
    if (!specReady) {
      setValidation({ status: "idle", data: null, message: "" });
      return undefined;
    }
    if (specIssue) {
      setValidation({ status: "input-error", data: null, message: specIssue });
      return undefined;
    }

    let active = true;
    const spec = buildSpec(form);
    setValidation({ status: "waiting", data: null, message: "" });
    const timer = window.setTimeout(() => {
      if (active) setValidation({ status: "loading", data: null, message: "" });
      api.validateSpec(spec)
        .then((data) => { if (active) setValidation({ status: data.valid ? "valid" : "invalid", data, message: "", specKey }); })
        .catch((error) => { if (active) setValidation({ status: "error", data: null, message: error.status >= 500 || !error.status ? "We couldn’t reach the validation service. Check your connection and retry." : error.message, retry: () => setValidation({ status: "idle", data: null, message: "" }) }); });
    }, 360);
    return () => { active = false; window.clearTimeout(timer); };
  }, [form.max_capacity, form.min_capacity, form.e, form.accuracy_class, specIssue, specReady, specKey, validationAttempt]);

  const update = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setLocalErrors((current) => ({ ...current, [name]: "" }));
    setFormError("");
    setSaveIssues([]);
    setSampleMessage("");
    setSampleError("");
  };

  const loadSampleInstrument = async () => {
    setSampleLoading(true);
    setSampleMessage("");
    setSampleError("");
    try {
      const sample = await api.sampleInstrument();
      const maker = manufacturers.find((item) => item.name.toLocaleLowerCase() === sample.manufacturer_name?.toLocaleLowerCase());
      const sampleFields = ["model", "serial_no", "max_capacity", "min_capacity", "e", "accuracy_class"];
      setForm((current) => {
        const next = {
          ...current,
          manufacturer_id: sample.manufacturer_id != null ? String(sample.manufacturer_id) : maker ? String(maker.id) : "",
        };
        sampleFields.forEach((name) => {
          if (sample[name] != null) next[name] = String(sample[name]);
        });
        return next;
      });
      setLocalErrors({});
      setFormError("");
      setSaveIssues([]);
      setValidationAttempt((value) => value + 1);
      setSampleMessage("Sample instrument loaded. Review the serial number before registering.");
    } catch {
      setSampleError("Unable to load the sample instrument. Please try again.");
    } finally {
      setSampleLoading(false);
    }
  };

  const reloadManufacturers = async () => {
    const items = await api.listManufacturers();
    setManufacturers(items);
    return items;
  };

  const submitManufacturer = async (event) => {
    event?.preventDefault();
    const name = newManufacturerName.trim();
    if (!name) { setMakerMessage("Enter a manufacturer name."); return; }
    setMakerSaving(true);
    setMakerMessage("");
    try {
      const created = await api.createManufacturer({ name });
      setMakerError("");
      setManufacturers((items) => [...items, created].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((current) => ({ ...current, manufacturer_id: String(created.id) }));
      setNewManufacturerName("");
      setAddManufacturer(false);
    } catch (error) {
      if (error.status === 409) {
        setMakerMessage("That manufacturer is already in the register. Select it from the list.");
        try { await reloadManufacturers(); } catch { /* keep the useful duplicate response */ }
      } else if (error.status === 403) setMakerMessage("Your account cannot add manufacturers.");
      else setMakerMessage(error.status >= 500 || !error.status ? "We couldn’t reach the service. Try again." : error.message);
    } finally {
      setMakerSaving(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!form.manufacturer_id) errors.manufacturer_id = "Choose a manufacturer.";
    if (!form.model.trim()) errors.model = "Enter the model.";
    if (!form.serial_no.trim()) errors.serial_no = "Enter the serial number.";
    if (!form.max_capacity) errors.max_capacity = "Enter Max in grams.";
    else if (!Number.isFinite(Number(form.max_capacity)) || Number(form.max_capacity) <= 0) errors.max_capacity = "Max must be a positive number.";
    if (!form.min_capacity) errors.min_capacity = "Enter Min in grams.";
    else if (!Number.isFinite(Number(form.min_capacity)) || Number(form.min_capacity) <= 0) errors.min_capacity = "Min must be a positive number.";
    if (!form.e) errors.e = "Enter e in grams.";
    else if (!Number.isFinite(Number(form.e)) || Number(form.e) <= 0) errors.e = "e must be a positive number.";
    if (form.max_capacity && form.min_capacity && Number(form.max_capacity) <= Number(form.min_capacity)) errors.min_capacity = "Min must be smaller than Max.";
    if (!form.accuracy_class) errors.accuracy_class = "Select an Accuracy Class.";
    if (form.model.length > 100) errors.model = "Model must be 100 characters or fewer.";
    if (form.serial_no.length > 100) errors.serial_no = "Serial Number must be 100 characters or fewer.";
    setLocalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const save = async (event) => {
    event.preventDefault();
    setFormError("");
    setSaveIssues([]);
    if (!validateForm()) {
      setFormError("Complete the required fields and correct the input errors.");
      return;
    }
    if (validation.status !== "valid" || validation.specKey !== specKey || !validation.data?.valid) {
      setFormError(validation.status === "invalid" ? "Correct the specification issues before saving." : "Wait for the specification check to pass before saving.");
      return;
    }

    setSaving(true);
    try {
      const created = await api.createInstrument({
        manufacturer_id: Number(form.manufacturer_id),
        model: form.model.trim(),
        serial_no: form.serial_no.trim(),
        ...buildSpec(form),
      });
      navigate(`/app/instruments/${created.id}`, { replace: true, state: { newlyRegistered: true } });
    } catch (error) {
      const detail = error.data?.detail;
      if (Array.isArray(detail)) {
        setSaveIssues(detail.map((item) => ({ field: item.loc?.at(-1) || "instrument", message: item.msg })));
        setFormError("The server rejected one or more fields. Correct them and try again.");
      } else if (detail && typeof detail === "object" && detail.issues) {
        setSaveIssues(detail.issues.filter((item) => item.severity === "error"));
        setFormError("The current specification does not pass server validation. Review the checks and try again.");
      } else setFormError(friendlyError(error));
    } finally {
      setSaving(false);
    }
  };

  return <div className="instrument-page">
    <div className="instrument-breadcrumb"><Link to="/app/instruments">Instruments</Link><span aria-hidden="true">›</span><span>Register Instrument</span></div>
    <PageHeader eyebrow="Instruments · New" title="Register Instrument" description="Enter the instrument details and specifications." actions={<div className="instrument-sample-action"><button className="instrument-button instrument-button--secondary instrument-button--small" type="button" onClick={loadSampleInstrument} disabled={sampleLoading || makerLoading}>{sampleLoading ? <><span className="instrument-spinner"/>Loading sample…</> : "Load Sample Instrument"}</button><small role={sampleError ? "alert" : "status"} aria-live="polite">{sampleError || sampleMessage || "For demo / testing"}</small></div>} />

    <form className="instrument-register-layout" onSubmit={save} noValidate>
      <section className="instrument-form-card" aria-labelledby="instrument-details-title">
        <header className="instrument-card-heading"><h2 id="instrument-details-title">Instrument Details</h2><span><i aria-hidden="true">*</i> Required</span></header>
        <div className="instrument-form-grid">
          <div className="instrument-field instrument-field--wide">
            <label htmlFor="manufacturer_id">Manufacturer <i>*</i></label>
            <div className="instrument-field-row">
              <select id="manufacturer_id" name="manufacturer_id" value={form.manufacturer_id} onChange={update} aria-invalid={Boolean(localErrors.manufacturer_id)} aria-describedby={localErrors.manufacturer_id ? "manufacturer-error" : undefined} disabled={makerLoading || manufacturers.length === 0}>
                <option value="">{makerLoading ? "Loading manufacturers…" : manufacturers.length ? "Select Manufacturer" : "No manufacturers available"}</option>
                {manufacturers.map((maker) => <option key={maker.id} value={maker.id}>{maker.name}</option>)}
              </select>
              <button className="instrument-inline-button" type="button" onClick={() => { setAddManufacturer((open) => !open); setMakerMessage(""); }}>{addManufacturer ? "Cancel" : "+ Add New"}</button>
            </div>
            {localErrors.manufacturer_id && <small className="instrument-field-error" id="manufacturer-error">{localErrors.manufacturer_id}</small>}
            {makerLoading && <small className="instrument-field-note">Loading registered manufacturers…</small>}
            {makerError && <small className="instrument-field-error">{makerError} <button className="instrument-link-button" type="button" onClick={() => setMakerRetry((value) => value + 1)}>Retry</button></small>}
            {!makerLoading && !makerError && manufacturers.length === 0 && <small className="instrument-field-note">Add a manufacturer to continue.</small>}
            {addManufacturer && <div className="manufacturer-add-form"><label htmlFor="new-manufacturer">Manufacturer name</label><div className="instrument-field-row"><input id="new-manufacturer" value={newManufacturerName} maxLength={200} onChange={(event) => { setNewManufacturerName(event.target.value); setMakerMessage(""); }} placeholder="Enter manufacturer name" required/><button className="instrument-button instrument-button--small" type="button" onClick={() => submitManufacturer()} disabled={makerSaving}>{makerSaving ? "Adding…" : "Add Manufacturer"}</button></div>{makerMessage && <small className="instrument-field-error" role="alert">{makerMessage}</small>}</div>}
          </div>

          <div className="instrument-field"><label htmlFor="model">Model <i>*</i></label><input id="model" name="model" value={form.model} onChange={update} maxLength={100} placeholder="Enter model name" autoComplete="off" aria-invalid={Boolean(localErrors.model)} />{localErrors.model && <small className="instrument-field-error">{localErrors.model}</small>}</div>
          <div className="instrument-field"><label htmlFor="serial_no">Serial Number <i>*</i></label><input id="serial_no" name="serial_no" value={form.serial_no} onChange={update} maxLength={100} placeholder="Enter serial number" autoComplete="off" aria-invalid={Boolean(localErrors.serial_no)} />{localErrors.serial_no && <small className="instrument-field-error">{localErrors.serial_no}</small>}</div>

          <div className="instrument-form-section instrument-form-section--wide"><h3>Specifications</h3><p>Use grams for Max, Min and e.</p></div>
          <div className="instrument-field"><label htmlFor="max_capacity">Max <i>*</i></label><div className="instrument-number-input"><input id="max_capacity" name="max_capacity" type="number" min="0" step="any" inputMode="decimal" value={form.max_capacity} onChange={update} placeholder="e.g. 6000" aria-invalid={Boolean(localErrors.max_capacity)} /><span>g</span></div>{localErrors.max_capacity && <small className="instrument-field-error">{localErrors.max_capacity}</small>}</div>
          <div className="instrument-field"><label htmlFor="min_capacity">Min <i>*</i></label><div className="instrument-number-input"><input id="min_capacity" name="min_capacity" type="number" min="0" step="any" inputMode="decimal" value={form.min_capacity} onChange={update} placeholder="e.g. 20" aria-invalid={Boolean(localErrors.min_capacity)} /><span>g</span></div>{localErrors.min_capacity && <small className="instrument-field-error">{localErrors.min_capacity}</small>}</div>
          <div className="instrument-field"><label htmlFor="e">e (Verification Scale Interval) <i>*</i></label><div className="instrument-number-input"><input id="e" name="e" type="number" min="0" step="any" inputMode="decimal" value={form.e} onChange={update} placeholder="e.g. 1" aria-invalid={Boolean(localErrors.e)} /><span>g</span></div>{localErrors.e && <small className="instrument-field-error">{localErrors.e}</small>}</div>
          <fieldset className="instrument-field instrument-class-field"><legend>Accuracy Class <i>*</i></legend><div className="instrument-class-options">{["I", "II", "III", "IV"].map((value) => <label key={value} className={form.accuracy_class === value ? "is-selected" : ""}><input type="radio" name="accuracy_class" value={value} checked={form.accuracy_class === value} onChange={update}/><span>{value}</span></label>)}</div>{localErrors.accuracy_class && <small className="instrument-field-error">{localErrors.accuracy_class}</small>}</fieldset>
        </div>
        {formError && <div className="instrument-form-error" role="alert"><strong>{formError}</strong>{saveIssues.length > 0 && <ul>{saveIssues.map((issue, index) => <li key={`${issue.field}-${index}`}><b>{fieldNames[issue.field] || issue.field.replaceAll("_", " ")}</b>: {issue.message}</li>)}</ul>}</div>}
        <div className="instrument-form-actions"><Link className="instrument-button instrument-button--secondary" to="/app/instruments">Cancel</Link><button className="instrument-button instrument-button--primary" type="submit" disabled={saving || makerLoading || manufacturers.length === 0}>{saving ? <><span className="instrument-spinner instrument-spinner--light"/>Saving Instrument…</> : "Save Instrument"}</button></div>
      </section>

      <ValidationPanel validation={{ ...validation, retry: () => setValidationAttempt((value) => value + 1) }} form={form} specIssue={specIssue}/>
    </form>
  </div>;
}
