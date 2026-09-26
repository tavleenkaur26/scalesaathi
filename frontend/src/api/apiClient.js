// apiClient.js — ScaleSaathi frontend API layer
// Matches backend/routes/*.py in tavleenkaur26/scalesaathi.
// All masses are in grams. Auth is a Bearer JWT (no cookies).

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function getToken() {
  return localStorage.getItem("ss_token");
}

function setToken(token) {
  if (token) localStorage.setItem("ss_token", token);
  else localStorage.removeItem("ss_token");
}

async function request(
  path,
  { method = "GET", body, isForm = false, auth = true } = {}
) {
  const headers = {};

  if (!isForm) {
    headers["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: isForm
      ? body
      : body !== undefined
        ? JSON.stringify(body)
        : undefined,
  });

  // 204 No Content
  if (res.status === 204) return null;

  const contentType = res.headers.get("content-type") || "";

  const data = contentType.includes("application/json")
    ? await res.json()
    : await res.blob();

  if (!res.ok) {
    if (res.status === 401 && auth && getToken()) {
      setToken(null);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("ss:unauthorized"));
      }
    }

    const message =
      (data &&
        (data.detail?.message || data.detail || data.message)) ||
      `Request failed (${res.status})`;

    const err = new Error(
      typeof message === "string" ? message : JSON.stringify(message)
    );

    err.status = res.status;
    err.data = data;

    throw err;
  }

  return data;
}

// Downloads a file response through the authenticated request.
// <a href> cannot attach the Bearer token, so we fetch the Blob first.
async function downloadBlob(path, filename) {
  const blob = await request(path);

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

export const api = {
  // ---------- auth ----------
  login: (email, password) =>
    request("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    }),

  register: (body) =>
    request("/auth/register", {
      method: "POST",
      body,
      auth: false,
    }),

  me: () => request("/auth/me"),

  demoUsers: () =>
    request("/auth/demo-users", {
      auth: false,
    }),

  setToken,
  getToken,

  logout: () => setToken(null),

  // ---------- manufacturers ----------
  createManufacturer: (body) =>
    request("/manufacturers", {
      method: "POST",
      body,
    }),

  listManufacturers: () =>
    request("/manufacturers"),

  // ---------- instruments ----------
  validateSpec: (spec) =>
    request("/instruments/validate-spec", {
      method: "POST",
      body: spec,
    }),

  createInstrument: (body) =>
    request("/instruments", {
      method: "POST",
      body,
    }),

  listInstruments: (params = {}) => {
    const qs = new URLSearchParams(params).toString();

    return request(
      `/instruments${qs ? `?${qs}` : ""}`
    );
  },

  getInstrument: (id) =>
    request(`/instruments/${id}`),

  getTestPlan: (id) =>
    request(`/instruments/${id}/test-plan`),

  // ---------- sessions ----------
  createSession: (body) =>
    request("/sessions", {
      method: "POST",
      body,
    }),

  listSessions: (status) =>
    request(
      `/sessions${status ? `?status=${status}` : ""}`
    ),

  getSession: (id) =>
    request(`/sessions/${id}`),

  saveObservation: (sessionId, test, payload) =>
    request(`/sessions/${sessionId}/observations`, {
      method: "POST",
      body: {
        test,
        payload,
      },
    }),

  evaluate: (sessionId) =>
    request(`/sessions/${sessionId}/evaluate`, {
      method: "POST",
    }),

  submit: (sessionId) =>
    request(`/sessions/${sessionId}/submit`, {
      method: "POST",
    }),

  startReview: (sessionId) =>
    request(`/sessions/${sessionId}/start-review`, {
      method: "POST",
    }),

  approve: (sessionId, comment) =>
    request(`/sessions/${sessionId}/approve`, {
      method: "POST",
      body: comment ? { comment } : undefined,
    }),

  returnSession: (sessionId, comment) =>
    request(`/sessions/${sessionId}/return`, {
      method: "POST",
      body: { comment },
    }),

  // ---------- attachments ----------
  uploadAttachment: (
    sessionId,
    file,
    kind = "photo",
    caption
  ) => {
    const form = new FormData();

    form.append("file", file);
    form.append("session_id", String(sessionId));
    form.append("kind", kind);

    if (caption) {
      form.append("caption", caption);
    }

    return request("/attachments", {
      method: "POST",
      body: form,
      isForm: true,
    });
  },

  attachmentUrl: (id) =>
    `${BASE_URL}/attachments/${id}`,

  getAttachment: (id) =>
    request(`/attachments/${id}`),

  deleteAttachment: (id) =>
    request(`/attachments/${id}`, {
      method: "DELETE",
    }),

  // ---------- demo / rulesets ----------
  sampleInstrument: () =>
    request("/demo/sample-instrument"),

  loadSample: () =>
    request("/demo/load-sample", {
      method: "POST",
    }),

  listRulesets: () =>
    request("/rulesets"),

  rulesetImpact: (version) =>
    request(`/rulesets/${version}/impact`),

  // ---------- reports / dashboard ----------
  listReports: (params = {}) => {
    const qs = new URLSearchParams(params).toString();

    return request(
      `/reports${qs ? `?${qs}` : ""}`
    );
  },

  // Get the full report context used by the
  // report detail page and PDF/DOCX generators.
  getReportContext: (sessionId, lang = "en") =>
    request(
      `/reports/${sessionId}/context?lang=${lang}`
    ),

  dashboardStats: () =>
    request("/dashboard/stats"),

  failureInsights: () =>
    request("/dashboard/failure-insights"),

  reportPdfUrl: (sessionId, lang = "en") =>
    `${BASE_URL}/reports/${sessionId}/pdf?lang=${lang}`,

  reportDocxUrl: (sessionId, lang = "en") =>
    `${BASE_URL}/reports/${sessionId}/docx?lang=${lang}`,

  downloadReportPdf: (
    sessionId,
    filename,
    lang = "en"
  ) =>
    downloadBlob(
      `/reports/${sessionId}/pdf?lang=${lang}`,
      filename
    ),

  downloadReportDocx: (
    sessionId,
    filename,
    lang = "en"
  ) =>
    downloadBlob(
      `/reports/${sessionId}/docx?lang=${lang}`,
      filename
    ),

  exportReportsCsv: (params = {}) => {
    const qs = new URLSearchParams(params).toString();

    return downloadBlob(
      `/reports/export.csv${qs ? `?${qs}` : ""}`,
      "scalesaathi_reports.csv"
    );
  },
};