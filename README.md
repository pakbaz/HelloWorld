# PromptForge

> **AI Prompt Sandbox & Snippet Manager**

A dedicated, lightweight developer tool for organizing, versioning, and testing AI prompt templates with dynamic variables — e.g., injecting a code snippet or a persona into a `{{code}}` or `{{role}}` block.

---

## Features

- **Rich SQL Relationships** — Requires relational tables (`Prompts`, `Variables`, `Tags`), giving Copilot an opportunity to showcase database design and query generation.
- **Algorithmic Utilities** — Parsing template placeholders (e.g., swapping `{{variable}}` inside a string with user-supplied values) provides a clear, programmatic string-manipulation task for Copilot to implement.
- **Component Diversity** — Features a mix of markdown previews, textarea tracking, and data tables, enabling Copilot to rapidly generate clean React UI components.

---

## Architecture: Full-Stack on GitHub Pages via PGlite

GitHub Pages only serves static files, so a traditional Node.js/Python server with a standalone PostgreSQL instance cannot run directly on its infrastructure.

PromptForge solves this by using [PGlite](https://github.com/electric-sql/pglite) — **Postgres compiled to WebAssembly** — enabling an end-to-end deployment on GitHub Pages while keeping a standard full-stack codebase that Copilot can analyze.

### How It Works

1. **The Database**
   Instead of connecting to a remote cloud database, the frontend installs `@electric-sql/pglite`. It runs a full, native copy of PostgreSQL inside the browser's WASM runtime, persisting data directly to the user's `IndexedDB`.

2. **The API Layer Abstraction**
   - *Local development:* A standard FastAPI backend (managed by `uv`) or a Node.js app handles HTTP requests and talks to a local Postgres instance.
   - *GitHub Pages (production):* A browser-side repository module replaces the backend. The React app executes the same SQL queries directly against the in-browser PGlite instance, transparently mimicking the backend layer.

### Result

A decoupled full-stack folder structure (`/frontend`, `/backend`) that Copilot can reason about, compiled into a **100% static site** suitable for free GitHub Pages hosting.
