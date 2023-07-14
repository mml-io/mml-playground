import fs from "fs";
import path from "path";
import url from "url";

import chokidar from "chokidar";
import { EditableNetworkedDOM, LocalObservableDOMFactory } from "networked-dom-server";
import WebSocket from "ws";

const getMmlDocumentContent = (documentPath: string) => {
  return fs.readFileSync(documentPath, { encoding: "utf8", flag: "r" });
};

export class PlaygroundMMLDocumentServer {
  private playgroundDocument: EditableNetworkedDOM;
  private examplesHostUrl: string;

  constructor(private playgroundDocumentPath: string) {
    // Load playground MML document content and create EditableNetworkedDOM
    this.playgroundDocument = new EditableNetworkedDOM(
      url.pathToFileURL(this.playgroundDocumentPath).toString(),
      LocalObservableDOMFactory,
    );

    // Watch for changes in DOM file and reload
    chokidar.watch(this.playgroundDocumentPath).on("change", () => {
      this.reload();
    });
  }

  public setHost(examplesHostUrl: string) {
    if (this.examplesHostUrl !== examplesHostUrl) {
      this.examplesHostUrl = examplesHostUrl;
      this.reload();
    }
  }

  public handle(ws: WebSocket) {
    this.playgroundDocument.addWebSocket(ws as any);
    ws.on("close", () => {
      this.playgroundDocument.removeWebSocket(ws as any);
    });
  }

  private reload() {
    this.playgroundDocument.load(getMmlDocumentContent(this.playgroundDocumentPath), {
      EXAMPLES_HOST_URL: this.examplesHostUrl,
    });
  }
}
