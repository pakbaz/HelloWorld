// PGlite's bundled Emscripten/WASM glue reads `process.exitCode` (and a few
// other `process.*` fields) unconditionally while initialising the database.
// Browsers have no `process` global, so on a static deploy (e.g. GitHub Pages)
// this throws "process is not defined" and the database fails to initialise.
//
// Provide a minimal shim *before* PGlite is constructed. It intentionally omits
// `versions.node` so Emscripten still detects the runtime as a browser (not
// Node) and uses the in-browser filesystem.
const globalScope = globalThis as unknown as Record<string, unknown>;

if (globalScope.process === undefined) {
  globalScope.process = { env: {} };
}

export {};
