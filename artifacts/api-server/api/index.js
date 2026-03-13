// Vercel serverless entry point
// Uses the pre-built esbuild bundle (dist/app.cjs) to avoid TypeScript recompilation
"use strict";

const appModule = require("../dist/app.cjs");

// Handle both ESM default export (esbuild interop) and direct export
module.exports = appModule.default || appModule;
