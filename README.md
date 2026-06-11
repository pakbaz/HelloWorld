# PromptForge

 (AI Prompt Sandbox & Snippet Manager)
A dedicated, lightweight developer tool where you can organize, version, and test AI prompt templates with dynamic variables (e.g., injecting a code snippet or a persona into a ⁠{{code}}⁠ or ⁠{{role}}⁠ block).
Why this is a killer demo for GitHub Copilot:
 Rich SQL Relationships: It requires relational tables (Prompts, Variables, and Tags), allowing Copilot to showcase its database design and query generation capabilities.
 Algorithmic Utilities: Parsing template placeholders (e.g., swapping ⁠{{variable}}⁠ inside a string with user input fields) gives Copilot a clear, programmatic string-manipulation task to write.
 Component Diversity: Features a mix of markdown previews, text area tracking, and data tables, which lets Copilot generate clean React UI components rapidly.
The "GitHub Pages" Architecture Trick
Because GitHub Pages only hosts static frontend files, you cannot run a traditional live Node.js or Python server alongside a standalone PostgreSQL instance directly on its infrastructure.
To achieve an End-to-End (e2e) deployment on GitHub Pages while still maintaining a standard full-stack codebase that Copilot can analyze, you use PGlite (Postgres in WebAssembly).
How it works:
1. The Database: Instead of connecting to a remote cloud DB, you install ⁠@electric-sql/pglite⁠ in your React frontend. It runs a full, native copy of PostgreSQL inside the browser's WASM runtime, persisting data directly to the user's IndexedDB.
2. The API Layer Abstraction: * For local development: You write a standard FastAPI backend managed by ⁠uv⁠ (or a Node.js app) that handles HTTP requests and talks to a local Postgres instance.
 For GitHub Pages deployment: You implement a simple browser-side repository module. When running in production on GitHub Pages, your React app executes those same SQL queries directly against the browser's PGlite instance, mimicking your backend layer.
This gives you a decoupled full-stack folder structure (⁠/frontend⁠, ⁠/backend⁠) for Copilot to reason about, while compiling into a 100% static site that works perfectly for free hosting.
