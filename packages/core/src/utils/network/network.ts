import { Vector2 } from "three";

export type AnimationState = "idle" | "walk" | "run";

export type ClientUpdate = {
  id: number;
  location: Vector2;
  rotation: Vector2;
  state: AnimationState;
};

export class Network {
  public connected: boolean = false;
  public clientUpdates: Map<number, ClientUpdate> = new Map();
  public id: number = 0;

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
                  this.disposeId(data.id);
                  console.log(`Client ID: ${data.id} left`);
                }
              } else if (message.data instanceof Blob) {
                const arrayBuffer = await new Response(message.data).arrayBuffer();
                const updates = this.decodeUpdate(arrayBuffer);
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

  nextId: number = 1;
  recycledIds: number[] = [];

  encoder: TextEncoder = new TextEncoder();
  decoder: TextDecoder = new TextDecoder();

  getId(): number {
    if (this.recycledIds.length > 0) {
      return this.recycledIds.pop() as number;
    } else {
      return this.nextId++;
    }
  }

  disposeId(id: number): void {
    this.recycledIds.push(id);
  }

  animationStateToByte(state: AnimationState) {
    switch (state) {
      case "idle":
        return 0;
      case "walk":
        return 1;
      case "run":
        return 2;
    }
  }

  byteToAnimationState(byte: number): AnimationState {
    switch (byte) {
      case 0:
        return "idle";
      case 1:
        return "walk";
      case 2:
        return "run";
      default:
        throw new Error("Invalid byte for animation state");
    }
  }

  encodeUpdate(update: ClientUpdate): ArrayBuffer {
    const buffer = new ArrayBuffer(15);
    const dataView = new DataView(buffer);
    dataView.setUint16(0, update.id); // id
    dataView.setFloat32(2, update.location.x); // position.x
    dataView.setFloat32(6, update.location.y); // position.z
    dataView.setInt16(10, update.rotation.x * 32767); // quaternion.y
    dataView.setInt16(12, update.rotation.y * 32767); // quaternion.w
    dataView.setUint8(14, this.animationStateToByte(update.state)); // animationState
    return buffer;
  }

  decodeUpdate(buffer: ArrayBuffer): ClientUpdate {
    const dataView = new DataView(buffer);
    const id = dataView.getUint16(0); // id
    const x = dataView.getFloat32(2); // position.x
    const z = dataView.getFloat32(6); // position.z
    const quaternionY = dataView.getInt16(10) / 32767; // quaternion.y
    const quaternionW = dataView.getInt16(12) / 32767; // quaternion.w
    const state = this.byteToAnimationState(dataView.getUint8(14)); // animationState
    const location = new Vector2(x, z);
    const rotation = new Vector2(quaternionY, quaternionW);
    return { id, location, rotation, state };
  }

  public sendUpdate(update: ClientUpdate): void {
    if (!this.connected) {
      console.log("Not connected to the server");
      return;
    }

    const encodedUpdate = this.encodeUpdate(update);
    this.connection.ws?.send(encodedUpdate);
  }
}
