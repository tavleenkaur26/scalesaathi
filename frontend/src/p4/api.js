// Thin fetch wrapper for the P4 pages. Change TOKEN_KEY if P3's login page
// stores the JWT under a different localStorage key.
const TOKEN_KEY = "token";
const BASE = import.meta.env?.VITE_API_BASE || "http://localhost:8000";

function authHeaders() {
  const t = localStorage.getItem(TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

function qs(params = {}) {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") p.set(k, v);
  });
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const api = {
  base: BASE,

  dashboardStats: () => get("/dashboard/stats"),
  failureInsights: () => get("/dashboard/failure-insights"),

  searchReports: (filters, page = 1, pageSize = 25) =>
    get(`/reports${qs({ ...filters, page, page_size: pageSize })}`),

  instrument: (id) => get(`/instruments/${id}`),

  // Downloads a file (CSV, PDF, DOCX) through the auth header, since <a href>
  // can't attach a Bearer token, then triggers the browser's save dialog.
  async downloadFile(path, filename) {
    const res = await fetch(`${BASE}${path}`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  exportCsvPath: (filters) => `/reports/export.csv${qs(filters)}`,
  reportPdfPath: (sessionId, lang = "en") => `/reports/${sessionId}/pdf?lang=${lang}`,
  reportDocxPath: (sessionId, lang = "en") => `/reports/${sessionId}/docx?lang=${lang}`,
};
