import fs from "fs";
import url from "url";

import chokidar from "chokidar";
import { EditableNetworkedDOM, LocalObservableDOMFactory } from "networked-dom-server";
import WebSocket from "ws";

const getMmlDocumentContent = (documentPath: string) => {
  const contents = fs.readFileSync(documentPath, {
    encoding: "utf8",
    flag: "r",
  });
  return `<m-group id="root"></m-group><script>${contents}</script>`;
};

export type ReactMMLDocumentServerOptions = {
  mmlDocumentPath: string;
  useWss: boolean;
};

export class ReactMMLDocumentServer {
  private mmlDocument: EditableNetworkedDOM;

  constructor(private options: ReactMMLDocumentServerOptions) {
    this.mmlDocument = new EditableNetworkedDOM(
      url.pathToFileURL(this.options.mmlDocumentPath).toString(),
      LocalObservableDOMFactory,
    );

    // Watch for changes in DOM file and reload
    chokidar.watch(this.options.mmlDocumentPath).on("change", () => {
      this.reload();
    });
    this.reload();
  }

  public handle(ws: WebSocket) {
    this.mmlDocument.addWebSocket(ws as any);
    ws.on("close", () => {
      this.mmlDocument.removeWebSocket(ws as any);
    });
  }

  private reload() {
    const isSecure = this.options.useWss;
    const httpProtocol = isSecure ? "https" : "http";
    const wsProtocol = isSecure ? "wss" : "ws";
    console.log("Reloading MML document", wsProtocol, httpProtocol);
    this.mmlDocument.load(getMmlDocumentContent(this.options.mmlDocumentPath), {
      httpProtocol,
      wsProtocol,
    });
  }
}
