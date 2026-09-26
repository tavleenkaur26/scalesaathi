# frontend/src/p4/ — Repository, Dashboard, Instrument History

Assumptions (frontend/ has no app scaffold yet — no package.json — so these
are written framework-light; adjust the two things below to match whatever
P3 sets up):

1. **React with `fetch`**, no chart/UI library dependency, so they drop in
   regardless of what P3 picks. Plain CSS classes in `p4.css` — restyle freely.
2. **`react-router-dom`** for `<Link>`/`useParams` in `InstrumentHistory.jsx`
   only. If P3 isn't using it, replace that one import + the two calls.

All API calls go through `api.js`, which reads the JWT from
`localStorage.getItem("token")` (whatever key P3's login page saves it under —
change `TOKEN_KEY` in `api.js` to match).

## Files → where they go

| File | Purpose | Talks to |
|---|---|---|
| `api.js` | fetch wrapper, base URL, auth header, CSV blob download helper | — |
| `Dashboard.jsx` | stat cards, recent activity feed, failure-insight bars | `GET /dashboard/stats`, `GET /dashboard/failure-insights` |
| `Repository.jsx` | filterable/searchable report table, pagination, CSV export button, links to PDF/Word | `GET /reports`, `GET /reports/export.csv`, `GET /reports/{id}/pdf`, `GET /reports/{id}/docx` |
| `InstrumentHistory.jsx` | every past session for one instrument | `GET /instruments/{id}` (uses its `.history` field) |
| `p4.css` | shared styling for all three | — |

Drop the `p4/` folder as-is into `frontend/src/`, then wire into P3's router,
e.g.:

```jsx
import Dashboard from "./p4/Dashboard";
import Repository from "./p4/Repository";
import InstrumentHistory from "./p4/InstrumentHistory";
// ...
<Route path="/dashboard" element={<Dashboard />} />
<Route path="/reports" element={<Repository />} />
<Route path="/instruments/:id/history" element={<InstrumentHistory />} />
```

Set the API base URL once via `VITE_API_BASE` (or edit the fallback in
`api.js` directly) — e.g. in `frontend/.env`:

```
VITE_API_BASE=https://<your-render-backend>.onrender.com
```
