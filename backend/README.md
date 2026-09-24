# ScaleSaathi backend (P2)

FastAPI + SQLAlchemy + Postgres (Neon). Imports the rule engine in-process (`engine/`), never over HTTP.

## Run locally (from the repo root)
    pip install -r backend/requirements.txt
    cp backend/.env.example .env        # leave DATABASE_URL unset to use a local SQLite file
    uvicorn backend.main:app --reload   # docs at http://localhost:8000/docs
    python -m pytest backend/tests -q   # 10 API tests

On startup it creates the tables, the demo lab + 3 users, ruleset v1 (from `engine/rulesets`), and the
sample history (10 sessions: pass, fail, rounding trap, marginal, returned, under review, draft).

## Demo users (password `Demo@1234`, also public at GET /auth/demo-users)
`admin@scalesaathi.demo` · `tester@scalesaathi.demo` · `reviewer@scalesaathi.demo`

## Layout
    main.py            app + startup seeding          routes/     thin HTTP layer
    models.py          ALL tables (only P2 edits)     services/   engine_adapter (only file importing `engine`),
    auth.py            JWT + require_role                          sessions, workflow, reporting, analytics, seed, audit

## Rules
- All masses in **grams**. Statuses: Draft, Submitted, Under Review, Approved, Returned.
- Observations: `POST /sessions/{id}/observations {test, payload}`. `test` is a SessionInput field
  (zero_reference, weighing, eccentricity, repeatability, discrimination, zero_setting, tare_setting,
  temperature, disturbances). Saving a test clears the old verdict; evaluate again before submitting.
- Sessions are locked after Submit. A tester cannot approve their own session (403).
- Report hash = SHA-256 of a canonical JSON of the approved record; `/verify/{hash}` recomputes it.
- Reports: `reports` package must export `generate_pdf(context)->bytes`, `generate_docx(context)->bytes`
  (optional `render_verify_page(data)->str`). `GET /reports/{session_id}/context` shows the exact context.
