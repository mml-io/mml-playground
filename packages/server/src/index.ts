import fs from "fs";
import path from "path";
import url from "url";

import { Network } from "@mml-playground/character-network";
import chokidar from "chokidar";
import express, { Request } from "express";
import enableWs from "express-ws";
import httpProxy from "http-proxy";
import { LocalObservableDOMFactory, EditableNetworkedDOM } from "networked-dom-server";

const PLAYGROUND_DOCUMENT_PATH = path.resolve(__dirname, "../playground.html");
const PORT = process.env.PORT || 8080;
const DOCUMENT_SOCKET_PATH = "/document";
const CHARACTER_NETWORK_SOCKET_PATH = "/network";
const EXAMPLE_DOCUMENTS_SOCKET_PATH = "/examples";
let examplesHostUrl = "";

const { app } = enableWs(express());
app.enable("trust proxy");

const getMmlDocumentContent = (documentPath: string) => {
  return fs.readFileSync(documentPath, { encoding: "utf8", flag: "r" }).replace(
    /\/\/\{PLAYGROUND_RUNTIME_CONSTANTS\}/g,
    `
    const EXAMPLES_HOST_URL = '${examplesHostUrl}';
  `,
  );
};

// Load playground MML document content and create EditableNetworkedDOM
const playgroundDocument = new EditableNetworkedDOM(
  url.pathToFileURL(PLAYGROUND_DOCUMENT_PATH).toString(),
  LocalObservableDOMFactory,
);

const updateExamplesHostUrl = (req: Request) => {
  if (!examplesHostUrl) {
    examplesHostUrl = `${req.secure ? "wss" : "ws"}://${
      req.headers["x-forwarded-host"]
        ? `${req.headers["x-forwarded-host"]}:${req.headers["x-forwarded-port"]}`
        : req.headers.host
    }${EXAMPLE_DOCUMENTS_SOCKET_PATH}`;

    playgroundDocument.load(getMmlDocumentContent(PLAYGROUND_DOCUMENT_PATH));
  }
};

playgroundDocument.load(getMmlDocumentContent(PLAYGROUND_DOCUMENT_PATH));

// Watch for changes in DOM file and reload
chokidar.watch(PLAYGROUND_DOCUMENT_PATH).on("change", () => {
  playgroundDocument.load(getMmlDocumentContent(PLAYGROUND_DOCUMENT_PATH));
});

// Handle playground document sockets
app.ws(DOCUMENT_SOCKET_PATH, (ws) => {
  playgroundDocument.addWebSocket(ws as any);
  ws.on("close", () => {
    playgroundDocument.removeWebSocket(ws as any);
  });
});

// Execute example documents
const exampleDocuments: {
  [key: string]: {
    documentPath: string;
    document: EditableNetworkedDOM;
  };
} = {};

// Create character network
const characterNetwork = new Network();
app.ws(CHARACTER_NETWORK_SOCKET_PATH, (ws) => {
  characterNetwork.connectClient(ws);
});

// Handle example document sockets
app.ws(`${EXAMPLE_DOCUMENTS_SOCKET_PATH}/:filename`, (ws, req) => {
  const { filename } = req.params;
  const exampleDocument = exampleDocuments[filename]?.document;
  if (!exampleDocument) {
    ws.close();
    return;
  }

  exampleDocument.addWebSocket(ws as any);
  ws.on("close", () => {
    exampleDocument.removeWebSocket(ws as any);
  });
});

const FORK_PAGE_CONTENT = `
  Please click the 'Fork' button to create your sandbox.
`;

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

    updateExamplesHostUrl(req);
    res.send(demoIndexContent);
  });
  app.use("/", express.static(demoModulePath));
}

// Forward requests to frontend dev server
else {
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

    updateExamplesHostUrl(req);
    proxy.web(req, res);
  });
}

const examplesWatchPath = path.resolve(path.join(__dirname, "../examples"), "*.html");
const watcher = chokidar.watch(examplesWatchPath, {
  ignored: /^\./,
  persistent: true,
});
watcher
  .on("add", (relativeFilePath) => {
    const filename = path.basename(relativeFilePath);
    console.log(`Example document '${filename}' has been added`);
    const contents = getMmlDocumentContent(relativeFilePath);
    const document = new EditableNetworkedDOM(
      url.pathToFileURL(filename).toString(),
      LocalObservableDOMFactory,
    );
    document.load(contents);

    const currentData = {
      documentPath: filename,
      document,
    };
    exampleDocuments[filename] = currentData;
  })
  .on("change", (relativeFilePath) => {
    const filename = path.basename(relativeFilePath);
    console.log(`Example document '${filename}' has been changed`);
    const contents = getMmlDocumentContent(relativeFilePath);
    const document = exampleDocuments[filename].document;
    document.load(contents);
  })
  .on("unlink", (relativeFilePath) => {
    const filename = path.basename(relativeFilePath);
    console.log(`Example document '${filename}' has been removed`);
    const document = exampleDocuments[filename].document;
    document.dispose();
    delete exampleDocuments[filename];
  })
  .on("error", (error) => {
    console.error("Error whilst watching directory", error);
  });

// Start listening
console.log("Listening on port", PORT);
app.listen(PORT);
