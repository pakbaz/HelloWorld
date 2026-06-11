# PromptForge — Backend (Local Development)

> **Note:** The backend is only required for local development. The production build on GitHub Pages uses PGlite (in-browser Postgres) and requires no server.

## Quickstart

### 1. Start PostgreSQL

```bash
cd backend
docker compose up -d
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env if your Postgres credentials differ from defaults
```

### 3. Install dependencies with `uv`

```bash
# Install uv if needed
curl -LsSf https://astral.sh/uv/install.sh | sh

uv sync
```

### 4. Run the API server

```bash
uv run uvicorn app.main:app --reload --port 8000
```

The API is available at `http://localhost:8000/api`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/prompts` | List all prompts |
| POST | `/api/prompts` | Create a new prompt |
| GET | `/api/prompts/:id` | Get a prompt |
| PUT | `/api/prompts/:id` | Update a prompt |
| DELETE | `/api/prompts/:id` | Delete a prompt |
| GET | `/api/prompts/:id/variables` | List variables |
| PUT | `/api/prompts/:id/variables` | Replace variables |
| PUT | `/api/prompts/:id/tags` | Set tags |
| GET | `/api/tags` | List tags |
| POST | `/api/tags` | Create a tag |
| PUT | `/api/tags/:id` | Update a tag |
| DELETE | `/api/tags/:id` | Delete a tag |
