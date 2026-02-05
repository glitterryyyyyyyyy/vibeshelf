# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


## Recommender dev wrapper (local)

This project includes a lightweight Python FastAPI wrapper used during frontend development to run the local "vibe" recommender alongside the Vite dev server.

When you enable the optional MySQL enrichment fallback (the wrapper will query your books DB to fill missing `coverImageUrl` or canonical IDs), set the following environment variables in your shell or dev environment:

- `MYSQL_HOST`  — hostname or IP of your MySQL server (e.g. `127.0.0.1`)
- `MYSQL_PORT`  — port number (default: `3306`)
- `MYSQL_USER`  — DB username
- `MYSQL_PASSWORD`  — DB password
- `MYSQL_DB`  — database name containing the books table

These env vars are optional if you don't use the DB fallback. The wrapper also attempts HTTP enrichment from the main backend before hitting the DB.

Example (macOS / zsh):

```zsh
export MYSQL_HOST=127.0.0.1
export MYSQL_PORT=3306
export MYSQL_USER=vibeshelf_user
export MYSQL_PASSWORD=supersecret
export MYSQL_DB=vibeshelf
```

To run the recommender API locally (from the repo root):

```zsh
# start uvicorn for development; adjust module name/path if different
uvicorn recommender_api:app --reload --host 127.0.0.1 --port 8000
```

Notes:
- The DB lookup SQL in the wrapper is a generic fallback and may require adjustment to match your actual table/column names (for example `books`, `id`, `cover_url`, etc.).
- For production use, move enrichment and DB access to a secure backend service and restrict CORS; the dev wrapper is intentionally permissive to streamline local development.
