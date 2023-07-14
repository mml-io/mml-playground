import { CharacterNetworkCodec, CharacterNetworkClientUpdate } from "./CharacterNetworkCodec";

export class CharacterNetworkClient {
  public connected: boolean = false;
  public clientUpdates: Map<number, CharacterNetworkClientUpdate> = new Map();
  public id: number = 0;

  public sendUpdate(update: CharacterNetworkClientUpdate): void {
    if (!this.connected) {
      console.log("Not connected to the server");
      return;
    }
    const encodedUpdate = CharacterNetworkCodec.encodeUpdate(update);
    this.connection.ws?.send(encodedUpdate);
  }

  public connection = {
    clientId: null as number | null,
    ws: null as WebSocket | null,
    connect: (url: string, timeout = 5000) => {
      return new Promise<void>((resolve, reject) => {
        const wsPromise = new Promise<void>((wsResolve, wsReject) => {
          try {
            this.connection.ws = new WebSocket(url);
            this.connection.ws.onerror = () => {
              this.connection.ws = null;
              wsReject(new Error("WebSocket player server not available"));
            };
            this.connection.ws.onmessage = async (message: MessageEvent) => {
              if (typeof message.data === "string") {
                const data = JSON.parse(message.data);
                if (data.type === "ping") {
                  this.connection.ws?.send(
                    JSON.stringify({ type: "pong", id: this.connection.clientId }),
                  );
                }
                if (typeof data.connected !== "undefined" && this.connected === false) {
                  this.connection.clientId = data.id;
                  this.id = this.connection.clientId!;
                  this.connected = true;
                  console.log(`Client ID: ${data.id} joined`);
                  wsResolve();
                }
                if (typeof data.disconnect !== "undefined") {
                  this.clientUpdates.delete(data.id);
                  console.log(`Client ID: ${data.id} left`);
                }
              } else if (message.data instanceof Blob) {
                const arrayBuffer = await new Response(message.data).arrayBuffer();
                const updates = CharacterNetworkCodec.decodeUpdate(arrayBuffer);
                this.clientUpdates.set(updates.id, updates);
              } else {
                console.log(message.data);
              }
            };
          } catch (error) {
            console.log("Connection failed:", error);
            wsReject(error);
          }
        });

        const timeoutPromise = new Promise<void>((_, timeoutReject) => {
          const id = setTimeout(() => {
            clearTimeout(id);
            timeoutReject(new Error("WS Connection timeout exceeded"));
          }, timeout);
        });

        Promise.race([wsPromise, timeoutPromise])
          .then(() => resolve())
          .catch((err) => reject(err));
      });
    },
  };
}
