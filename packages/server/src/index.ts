import path from "path";
import url from "url";

import { UserNetworkingServer } from "@mml-io/3d-web-user-networking";
import cors from "cors";
import express from "express";
import enableWs from "express-ws";

import { MMLDocumentsServer } from "./router/MMLDocumentsServer";
import { ReactMMLDocumentServer } from "./router/ReactMMLDocumentServer";
import { addWebAppRoutes } from "./router/web-app-routes";

const dirname = url.fileURLToPath(new URL(".", import.meta.url));
const PORT = process.env.PORT || 8080;
const MML_DOCUMENT_PATH = path.join(dirname, "../../playground/build/index.js");
const examplesWatchPath = path.resolve(path.join(dirname, "../examples"), "*.html");

const { app } = enableWs(express());
app.enable("trust proxy");

const mmlDocumentsServer = new MMLDocumentsServer(examplesWatchPath);
const reactMMLDocumentServer = new ReactMMLDocumentServer(MML_DOCUMENT_PATH);

// Handle playground document sockets
app.ws("/playground", (ws) => {
  reactMMLDocumentServer.handle(ws);
});

// Handle example document sockets
app.ws(`/examples/:filename`, (ws, req) => {
  const { filename } = req.params;
  mmlDocumentsServer.handle(filename, ws);
});

// Serve assets with CORS allowing all origins
app.use("/assets/", cors(), express.static(path.resolve(dirname, "../assets/")));

const userNetworkingServer = new UserNetworkingServer();
app.ws("/network", (ws) => {
  userNetworkingServer.connectClient(ws);
});

// Serve the app (including development mode)
addWebAppRoutes(app);

// Start listening
console.log("Listening on port", PORT);
app.listen(PORT);
