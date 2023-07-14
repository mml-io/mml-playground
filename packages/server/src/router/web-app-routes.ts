import fs from "fs";
import path from "path";

import express from "express";
import httpProxy from "http-proxy";

const FORK_PAGE_CONTENT = `
  Please click the 'Fork' button to create your sandbox.
`;

export function addWebAppRoutes(app: express.Application) {
  // Serve frontend statically in production
  if (process.env.NODE_ENV === "production") {
    const demoModulePath = require
      .resolve("@mml-playground/web/package.json")
      .replace("package.json", "dist");
    const demoIndexContent = fs.readFileSync(path.join(demoModulePath, "index.html"), "utf8");
    app.get("/", (req, res) => {
      if (process.env.DISABLE_SERVER === "true") {
        res.send(FORK_PAGE_CONTENT);
        return;
      }
      res.send(demoIndexContent);
    });
    app.use("/", express.static(demoModulePath));
  } else {
    // Forward requests to frontend dev server
    const proxy = httpProxy.createProxyServer({
      target: {
        host: "127.0.0.1",
        port: 3000,
      },
    });
    app.get("/*", (req, res) => {
      if (process.env.DISABLE_SERVER === "true") {
        res.send(FORK_PAGE_CONTENT);
        return;
      }
      proxy.web(req, res);
    });
  }
}
