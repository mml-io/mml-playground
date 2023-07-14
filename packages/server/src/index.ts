import path from "path";

import { CharacterNetworkServer } from "@mml-playground/character-network";
import express from "express";
import enableWs from "express-ws";
import WebSocket from "ws";

import { MMLDocumentsServer } from "./router/MMLDocumentsServer";
import { PlaygroundMMLDocumentServer } from "./router/PlaygroundMMLDocumentServer";
import { addWebAppRoutes } from "./router/web-app-routes";

const PORT = process.env.PORT || 8080;
const DOCUMENT_SOCKET_PATH = "/document";
const CHARACTER_NETWORK_SOCKET_PATH = "/network";
const PLAYGROUND_DOCUMENT_PATH = path.resolve(__dirname, "../playground.html");
const EXAMPLE_DOCUMENTS_SOCKET_PATH = "/examples";
const examplesWatchPath = path.resolve(path.join(__dirname, "../examples"), "*.html");

const { app } = enableWs(express());
app.enable("trust proxy");

const mmlDocumentsServer = new MMLDocumentsServer(examplesWatchPath);
const playgroundMMLDocumentServer = new PlaygroundMMLDocumentServer(PLAYGROUND_DOCUMENT_PATH);

app.use("/*", (req: express.Request, res, next) => {
  const examplesHostUrl = `${req.secure ? "wss" : "ws"}://${
    req.headers["x-forwarded-host"]
      ? `${req.headers["x-forwarded-host"]}:${req.headers["x-forwarded-port"]}`
      : req.headers.host
  }${EXAMPLE_DOCUMENTS_SOCKET_PATH}`;
  playgroundMMLDocumentServer.setHost(examplesHostUrl);
  next();
});

// Handle playground document sockets
app.ws(DOCUMENT_SOCKET_PATH, (ws) => {
  playgroundMMLDocumentServer.handle(ws);
});

// Handle example document sockets
app.ws(`${EXAMPLE_DOCUMENTS_SOCKET_PATH}/:filename`, (ws: WebSocket, req: express.Request) => {
  const { filename } = req.params;
  mmlDocumentsServer.handle(filename, ws);
});

const characterNetwork = new CharacterNetworkServer();
app.ws(CHARACTER_NETWORK_SOCKET_PATH, (ws) => {
  characterNetwork.connectClient(ws);
});

// Serve the app (including development mode)
addWebAppRoutes(app);

// Start listening
console.log("Listening on port", PORT);
app.listen(PORT);
