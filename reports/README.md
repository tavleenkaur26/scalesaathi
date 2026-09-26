# reports/ (P4)

Generates the PDF/Word report, the QR code, and the branded `/verify/{hash}`
page. This package lives at the **repo root**, next to `/engine`, `/backend`,
`/frontend` — `backend/routes/repository.py` already does `import reports`
and expects exactly this shape (see the docstring in `reports/__init__.py`).
You don't need to touch any backend files; P2 already built the routes,
the hashing, and the `get_report_context()` function that hands you data.

## Install

```bash
pip install -r reports/requirements.txt
```

WeasyPrint needs a few system libraries for text/font layout (already present
in this sandbox and in most Docker base images, but if `pip install` runs
fine and `generate_pdf` blows up on import, install these):

```bash
# Debian/Ubuntu (and Render's build step, via apt.txt or a Dockerfile)
apt-get install -y libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 libcairo2
```

For the Hindi toggle to render Devanagari glyphs (not tofu boxes) on the
deploy box, make sure a Devanagari-capable font is installed, e.g.:

```bash
apt-get install -y fonts-noto-core
```

## Files

| File | What it does |
|---|---|
| `__init__.py` | Exposes `generate_pdf`, `generate_docx`, `render_verify_page` — the 3 hooks P2's routes call |
| `common.py` | `build_view(context)` — turns P2's raw context into display-ready rows, shared by PDF + DOCX so they can't drift apart. Also computes the rounding-trap flag per row (naive verdict != R76 verdict) |
| `i18n.py` | EN/HI label dictionaries. Add more languages here, not in the templates |
| `qr.py` | QR code → PNG bytes / data URI, pointed at `report.verify_url` |
| `pdf.py` | Jinja2 renders `templates/report.html`, WeasyPrint prints it to PDF bytes |
| `docx.py` | Builds the same content as a `.docx` with `python-docx` (see note below on why not docxtpl) |
| `verify_page.py` | Nicer branded HTML for the public verify page (optional; `reporting.verify_html()` is the fallback if this errors) |
| `templates/report.html` | The one template both the PDF and (conceptually) the layout are based on. Edit this to restyle the report |
| `context_example.py` | Fabricated context so you can generate a sample PDF/DOCX/verify page **without a database**: `python -m reports.context_example` |

## Why python-docx instead of docxtpl

The Day-1 contract named docxtpl (a `.docx` file with `{{ }}` tags you build
in Word). That requires hand-authoring a Word template file, which isn't
practical in a text-only workflow. `docx.py` builds the identical structure
programmatically with `python-docx` instead — still a normal, fully editable
`.docx` for the maker-checker/officer to open in Word. If you get 10 minutes
and prefer the templating workflow, the swap is: build
`reports/templates/report_template.docx` in Word with `{{ instrument.model }}`
etc. tags matching `build_view()`'s keys, then replace the body of
`generate_docx()` with a `DocxTemplate(...).render(view)` call.

## Testing without the backend running

```bash
cd <repo root>
python -m reports.context_example
# writes fixture_report.pdf, fixture_report.docx, fixture_verify.html
```

**These fixture files use fabricated data (fake lab name, fake accreditation
number, fake clause numbers) — they're for checking the layout only. Never
put them in the PPT, the demo video, or the README as if they were a real
report.** For anything shown to a judge, generate a report from an actual
approved session through the real API (see below) and use that file instead.

## Testing through the real API

Once P2's backend is up and a session has been approved (status `Approved`,
a `Report` row exists):

```
GET /reports/{session_id}/pdf         -> the PDF
GET /reports/{session_id}/docx        -> the Word doc
GET /reports/{session_id}/pdf?lang=hi -> Hindi labels
GET /verify/{hash}                    -> this package's branded page
GET /verify/{hash}?format=json        -> raw verify() dict, no HTML
GET /reports/{session_id}/context     -> exactly what get_report_context() returns (no binary data), handy for debugging your templates against real data
```

## Remaining P4 work (not in this package)

This package covers the report generator + verify page (the "Done when"
line: *approved session → correct PDF/Word, QR scans to verify page*). Still
to build, against endpoints P2 already wired (`backend/routes/repository.py`
+ `backend/services/analytics.py` — both already fully implemented, you're
just consuming them from the frontend):

- Repository page: `GET /reports?search=&manufacturer=&model=&status=&verdict=&date_from=&date_to=&page=`
- CSV export button: `GET /reports/export.csv` (same filters)
- Instrument history: `GET /instruments/{id}` → `.history` field
- Dashboard: `GET /dashboard/stats`
- Failure insights charts: `GET /dashboard/failure-insights`

All of those need a Bearer JWT (`Authorization: Bearer <token>` from
`POST /auth/login`) except `/verify/{hash}`, which is public.
