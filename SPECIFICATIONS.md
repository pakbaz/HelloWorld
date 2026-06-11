# PromptForge — Specifications

## 1. Overview

**PromptForge** is a lightweight, browser-based developer tool for managing AI prompt templates. Users can compose, organize, version, and test prompts that contain dynamic variable placeholders (e.g., `{{code}}`, `{{role}}`). At runtime, placeholders are replaced with user-supplied values before the prompt is dispatched to an AI model.

---

## 2. Goals

| # | Goal |
|---|------|
| G1 | Enable users to create, edit, tag, and version prompt templates. |
| G2 | Support dynamic variable substitution within prompt templates. |
| G3 | Provide a live preview of the rendered prompt before submission. |
| G4 | Persist all data locally in the browser using PGlite (IndexedDB). |
| G5 | Deploy as a 100% static site on GitHub Pages (no backend required in production). |
| G6 | Maintain a conventional full-stack project structure (`/frontend`, `/backend`) for local development. |

---

## 3. Data Model

### 3.1 `Prompts`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID / serial | Primary key |
| `title` | TEXT | Human-readable name |
| `body` | TEXT | Template text with `{{variable}}` placeholders |
| `version` | INTEGER | Incremented on each save |
| `created_at` | TIMESTAMP | Auto-set on insert |
| `updated_at` | TIMESTAMP | Auto-set on update |

### 3.2 `Variables`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID / serial | Primary key |
| `prompt_id` | FK → Prompts | Owning prompt |
| `name` | TEXT | Placeholder name (without `{{ }}`) |
| `default_value` | TEXT | Optional default |

### 3.3 `Tags`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID / serial | Primary key |
| `name` | TEXT | Unique tag label |

### 3.4 `Prompt_Tags` (join table)

| Column | Type | Notes |
|--------|------|-------|
| `prompt_id` | FK → Prompts | |
| `tag_id` | FK → Tags | |

---

## 4. Functional Requirements

### 4.1 Prompt Management

- **FR-1** Users can create a new prompt with a title and a body containing zero or more `{{variable}}` placeholders.
- **FR-2** Users can edit and save an existing prompt; each save increments the version number.
- **FR-3** Users can delete a prompt (soft or hard delete).
- **FR-4** Users can list all prompts, filtered and/or sorted by title, tag, or date.
- **FR-5** Users can tag prompts with one or more labels for categorization.

### 4.2 Variable Substitution

- **FR-6** The system automatically parses all `{{variable}}` placeholders in a prompt body and renders an input field for each unique placeholder.
- **FR-7** Users fill in variable values; the system produces a rendered (substituted) prompt string in real time.
- **FR-8** Default values defined in the `Variables` table are pre-populated in the corresponding input fields.

### 4.3 Preview & Testing

- **FR-9** A live markdown preview panel displays the rendered prompt as the user types.
- **FR-10** Users can copy the rendered prompt to the clipboard with a single action.

### 4.4 Versioning

- **FR-11** Each saved state of a prompt is stored as an immutable snapshot; users can view the history and restore any previous version.

---

## 5. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | **Performance** — The UI must remain responsive with up to 1,000 stored prompts. |
| NFR-2 | **Portability** — The production build must be a self-contained static bundle deployable to GitHub Pages with no server-side runtime. |
| NFR-3 | **Persistence** — All data must survive full page reloads via browser `IndexedDB` (managed by PGlite). |
| NFR-4 | **Maintainability** — Frontend and backend code must reside in separate top-level folders (`/frontend`, `/backend`). |
| NFR-5 | **Developer Experience** — Local development must use a conventional FastAPI (Python/`uv`) or Node.js backend with a real Postgres instance. |

---

## 6. Architecture

```
/
├── frontend/          # React application
│   ├── src/
│   │   ├── components/   # UI components (PromptEditor, VariablePanel, PreviewPane, TagSelector, DataTable)
│   │   ├── db/           # PGlite initialization & SQL query helpers
│   │   └── repository/   # Abstraction layer — swaps between HTTP API (dev) and PGlite (prod)
│   └── ...
└── backend/           # FastAPI or Node.js server (local dev only)
    ├── routes/
    ├── models/
    └── ...
```

### 6.1 Database Layer

| Environment | Database | Transport |
|-------------|----------|-----------|
| Local dev | Postgres (Docker or local install) | HTTP via FastAPI / Node.js |
| GitHub Pages | PGlite (WASM in-browser) | Direct SQL in the browser |

### 6.2 Repository Abstraction

A thin `repository` module in the frontend exposes a single interface (e.g., `getPrompts`, `savePrompt`, `deletePrompt`). At build time (or via an environment variable), the module resolves to either:

- **`HttpRepository`** — calls the local backend REST API.
- **`PGliteRepository`** — runs SQL directly against the in-browser PGlite instance.

---

## 7. UI Components

| Component | Responsibility |
|-----------|---------------|
| `PromptEditor` | Textarea for authoring prompt body; detects and highlights `{{placeholders}}`. |
| `VariablePanel` | Renders one input field per unique placeholder; supports default values. |
| `PreviewPane` | Shows markdown-rendered substituted prompt in real time. |
| `TagSelector` | Multi-select tag picker; supports creating new tags inline. |
| `PromptTable` | Paginated/sorted data table listing all saved prompts. |
| `VersionHistory` | Timeline view of saved versions with restore action. |

---

## 8. Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React (TypeScript) |
| In-browser database | `@electric-sql/pglite` |
| Local dev backend | FastAPI (`uv`) **or** Node.js / Express |
| Local dev database | PostgreSQL |
| Hosting | GitHub Pages (static) |
| Package manager | npm / pnpm (frontend), `uv` (Python backend) |

---

## 9. Out of Scope (v1)

- User authentication / multi-user support.
- Cloud sync or remote database integration.
- Direct AI model API calls from within the tool.
- Mobile-specific UI optimizations.
