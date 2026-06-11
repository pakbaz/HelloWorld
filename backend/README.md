# PromptForge — Backend

Local development REST API server for PromptForge, built with **FastAPI** and **PostgreSQL**.

---

## Prerequisites

| Tool | Purpose |
|------|---------|
| [Python 3.11+](https://www.python.org/) | Runtime |
| [`uv`](https://docs.astral.sh/uv/) | Python package / project manager |
| [Docker](https://www.docker.com/) + [Docker Compose](https://docs.docker.com/compose/) | Run a local Postgres instance |

---

## Quickstart

### 1. Start PostgreSQL

```bash
# From the /backend directory
docker compose up -d
```

This starts a PostgreSQL 16 container on port **5432** with the credentials defined in `docker-compose.yml`:

| Setting | Value |
|---------|-------|
| Host | `localhost` |
| Port | `5432` |
| Database | `promptforge` |
| User | `promptforge` |
| Password | `promptforge` |

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env if your Postgres credentials differ from the defaults
```

### 3. Install dependencies with `uv`

```bash
# Install uv (if not already installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create a virtual environment and install dependencies
uv sync
```

### 4. Start the API server

```bash
uv run uvicorn app.main:app --reload
```

The API is now available at **http://localhost:8000**.

Interactive API docs: **http://localhost:8000/docs**

---

## Endpoints

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Server health check |

### Prompts

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/prompts` | List all prompts (supports `?q=`, `?tag=`, `?sort=`, `?order=`) |
| `POST` | `/prompts` | Create a new prompt |
| `GET` | `/prompts/{id}` | Get a prompt by ID |
| `PUT` | `/prompts/{id}` | Update a prompt (auto-increments version) |
| `DELETE` | `/prompts/{id}` | Delete a prompt |
| `GET` | `/prompts/{id}/versions` | List version history for a prompt |
| `POST` | `/prompts/{id}/restore/{version}` | Restore a previous version |
| `POST` | `/prompts/{id}/tags/{tag_id}` | Add a tag to a prompt |
| `DELETE` | `/prompts/{id}/tags/{tag_id}` | Remove a tag from a prompt |

### Variables

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/prompts/{id}/variables` | List variables for a prompt |
| `POST` | `/prompts/{id}/variables` | Create a variable for a prompt |
| `PUT` | `/variables/{id}` | Update a variable |
| `DELETE` | `/variables/{id}` | Delete a variable |

### Tags

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/tags` | List all tags |
| `POST` | `/tags` | Create a tag (idempotent by name) |
| `GET` | `/tags/{id}` | Get a tag by ID |
| `DELETE` | `/tags/{id}` | Delete a tag |

---

## Database Schema

Tables are created automatically on server start via SQLAlchemy's `create_all`.

```
prompts          – id, title, body, version, created_at, updated_at
prompt_versions  – id, prompt_id, title, body, version, saved_at
variables        – id, prompt_id, name, default_value
tags             – id, name (unique)
prompt_tags      – prompt_id, tag_id  (join table)
```

---

## Running Tests

```bash
uv run pytest
```

---

## Stopping Postgres

```bash
docker compose down
# To also remove the data volume:
docker compose down -v
```
