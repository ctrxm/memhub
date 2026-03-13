"use strict";

let app;

try {
  const appModule = require("./app.cjs");
  app = appModule.default || appModule;
} catch (err) {
  console.error("[vercel] Failed to load app bundle:", err.message);
  app = (req, res) => {
    res.status(500).json({
      error: "Server failed to initialize",
      message: err.message,
    });
  };
}

module.exports = app;
