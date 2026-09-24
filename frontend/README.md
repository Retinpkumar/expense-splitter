# Expense Splitter — Frontend

React + TypeScript app, scaffolded with Vite. See `_docs/DECISIONS.md` #12
for the stack rationale.

## Setup

```bash
npm install
npm run dev      # http://localhost:5173, proxies /api/* to the backend
npm run build    # type-checks and builds to dist/
```

Run the backend first (`cd ../backend && uv run uvicorn app.main:app --reload`)
so the dev proxy has something to forward to.

## Typed API client

`src/api/schema.d.ts` is generated from the backend's OpenAPI schema via
`openapi-typescript`, and `src/api/client.ts` wraps it with `openapi-fetch`
for a fully typed client. After changing a backend endpoint, regenerate the
types against a running local backend:

```bash
npm run generate:api-types
```
