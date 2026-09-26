import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/apiClient";
import PageHeader from "../../components/PageHeader";
import "./InstrumentPages.css";

function Capacity({ value }) {
  return <>{Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 })} g</>;
}

export default function InstrumentsList() {
  const [instruments, setInstruments] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [search, setSearch] = useState("");
  const [manufacturerFilter, setManufacturerFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([api.listInstruments(), api.listManufacturers().catch(() => [])])
      .then(([items, makers]) => { if (active) { setInstruments(items); setManufacturers(makers); } })
      .catch(() => { if (active) setError("We couldn’t load instrument records. Check your connection and try again."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return instruments.filter((item) => {
      const matchesQuery = !query || [item.manufacturer, item.model, item.serial_no, String(item.id)].some((value) => String(value || "").toLowerCase().includes(query));
      return matchesQuery && (!manufacturerFilter || String(item.manufacturer_id) === manufacturerFilter);
    });
  }, [instruments, search, manufacturerFilter]);

  return <div className="instrument-page">
    <PageHeader eyebrow="Catalog" title="Instruments" description="Manage and track registered weighing instruments." actions={<Link className="instrument-button instrument-button--primary" to="/app/instruments/new"><span aria-hidden="true">＋</span> Register Instrument</Link>} />

    <section className="instrument-list-card" aria-label="Instrument register">
      <div className="instrument-list-controls">
        <label className="instrument-search"><span className="sr-only">Search instruments</span><span aria-hidden="true">⌕</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by manufacturer, model, serial number…" /></label>
        <label className="instrument-filter"><span className="sr-only">Filter by manufacturer</span><select value={manufacturerFilter} onChange={(event) => setManufacturerFilter(event.target.value)}><option value="">All Manufacturers</option>{manufacturers.map((maker) => <option key={maker.id} value={maker.id}>{maker.name}</option>)}</select></label>
      </div>

      {loading && <div className="instrument-state" role="status"><span className="auth-spinner"/>Loading registered instruments…</div>}
      {error && <div className="instrument-state instrument-state--error" role="alert"><p>{error}</p><button type="button" className="instrument-button instrument-button--secondary" onClick={() => setRetry((value) => value + 1)}>Try again</button></div>}
      {!loading && !error && instruments.length === 0 && <div className="instrument-empty"><span className="instrument-empty__mark" aria-hidden="true">⚖</span><h2>No instruments registered yet</h2><p>Add your laboratory’s first weighing instrument to begin.</p><Link className="instrument-button instrument-button--primary" to="/app/instruments/new">Register Instrument</Link></div>}
      {!loading && !error && instruments.length > 0 && visible.length === 0 && <div className="instrument-state">No instruments match those filters. <button type="button" className="instrument-link-button" onClick={() => { setSearch(""); setManufacturerFilter(""); }}>Clear filters</button></div>}

      {!loading && !error && visible.length > 0 && <>
        <div className="instrument-table-scroll"><table className="instrument-table">
          <thead><tr><th>ID</th><th>Manufacturer</th><th>Model</th><th>Serial Number</th><th>Max</th><th>Accuracy Class</th><th>Registration</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{visible.map((item) => <tr key={item.id}>
            <td><span className="instrument-id">INS-{String(item.id).padStart(3, "0")}</span></td><td>{item.manufacturer}</td><td>{item.model}</td><td>{item.serial_no}</td><td><Capacity value={item.max_capacity}/></td><td>{item.accuracy_class}</td><td><span className="instrument-status">Registered</span></td><td><Link className="instrument-row-action" to={`/app/instruments/${item.id}`} aria-label={`View ${item.model}, serial ${item.serial_no}`}>View <span aria-hidden="true">→</span></Link></td>
          </tr>)}</tbody>
        </table></div>
        <div className="instrument-mobile-cards">{visible.map((item) => <Link className="instrument-mobile-card" key={item.id} to={`/app/instruments/${item.id}`}>
          <span className="instrument-id">INS-{String(item.id).padStart(3, "0")}</span><span className="instrument-status">Registered</span><strong>{item.manufacturer} · {item.model}</strong><span>Serial {item.serial_no}</span><span>Max <Capacity value={item.max_capacity}/> · Class {item.accuracy_class}</span>
        </Link>)}</div>
        <div className="instrument-list-footer"><span>Showing {visible.length} of {instruments.length} instruments</span><span>Open a record to view its specifications</span></div>
      </>}
    </section>
  </div>;
}
