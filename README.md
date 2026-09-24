# Expense Splitter

A group expense-tracking app (Splitwise-style): create a group, add
expenses with a split ratio, and see who owes whom.

- **Backend:** FastAPI (Python)
- **Frontend:** React + TypeScript (Vite)

## Prerequisites

- Python 3.11+ and [`uv`](https://docs.astral.sh/uv/) for the backend
- Node.js 20+ and npm for the frontend

## Setup

Run the backend first, then the frontend in a second terminal — the
frontend's dev server proxies API requests to it.

### Backend

```bash
cd backend
uv sync                                 # install deps, create .venv/
uv run alembic upgrade head             # create/update the SQLite schema
uv run pytest                           # run the test suite
uv run uvicorn app.main:app --reload    # dev server on http://127.0.0.1:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173, proxies /api/* to the backend
npm run build    # type-checks and builds to dist/
```

With both running, open http://localhost:5173.

## Architecture

- `backend/app/main.py` — FastAPI app entrypoint; routers are included here.
- `backend/app/routers/` — API route handlers (one module per resource).
- `backend/app/schemas/` — Pydantic request/response models.
- `backend/app/models/` — data models (ORM models once persistence is added).
- `backend/app/services/` — business logic kept independent of the HTTP
  layer (e.g. balance calculation).
- `backend/tests/` — pytest suite, mirrors the `app/` layout.
- `frontend/src/api/` — typed API client (`schema.d.ts` generated from the
  backend's OpenAPI schema via `openapi-typescript`, wrapped by
  `openapi-fetch`). Regenerate after changing a backend endpoint:
  ```bash
  cd frontend && npm run generate:api-types
  ```
- `frontend/src/pages/` — route-level views (group creation, group detail,
  add-expense, settle-up).

For more detail, see:

- [`_docs/API.md`](_docs/API.md) — API reference
- [`_docs/DECISIONS.md`](_docs/DECISIONS.md) — architecture/stack decisions
- [`_docs/PROCESS.md`](_docs/PROCESS.md) — development process

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for branch naming, commit format,
and the PR/review workflow.
