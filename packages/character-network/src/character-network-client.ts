import { Vector2, Vector3 } from "three";

import { AnimationState, ClientUpdate } from "./types";

class CharacterNetworkClient {
  public connected: boolean = false;
  public clientUpdates: Map<number, ClientUpdate> = new Map();
  public receivedPackets: { bytes: number; timestamp: number }[] = [];

  public id: number = 0;

  public addReceivedPacket(bytes: number): void {
    const timestamp = Date.now();
    this.receivedPackets.push({ bytes, timestamp });

    const oneSecondAgo = timestamp - 1000;
    while (this.receivedPackets.length > 0 && this.receivedPackets[0].timestamp < oneSecondAgo) {
      this.receivedPackets.shift();
    }
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
                  if (this.clientUpdates.get(0)) this.clientUpdates.delete(0);
                  this.connection.clientId = data.id;
                  this.id = this.connection.clientId!;
                  this.connected = true;
                  console.log(`Client ID: ${data.id} joined`);
                  wsResolve();
                }
                if (typeof data.disconnect !== "undefined") {
                  if (this.clientUpdates.get(0)) this.clientUpdates.delete(0);
                  this.clientUpdates.delete(data.id);
                  console.log(`Client ID: ${data.id} left`);
                }
              } else if (message.data instanceof Blob) {
                const arrayBuffer = await new Response(message.data).arrayBuffer();
                this.addReceivedPacket(arrayBuffer.byteLength);
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

  animationStateToByte(state: AnimationState) {
    switch (state) {
      case "idle":
        return 0;
      case "walk":
        return 1;
      case "run":
        return 2;
      case "jumpToAir":
        return 3;
      case "air":
        return 4;
      case "airToGround":
        return 5;
      default:
        return 0;
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
      case 3:
        return "jumpToAir";
      case 4:
        return "air";
      case 5:
        return "airToGround";
      default:
        return "idle";
    }
  }

  encodeUpdate(update: ClientUpdate): ArrayBuffer {
    const buffer = new ArrayBuffer(19);
    const dataView = new DataView(buffer);
    dataView.setUint16(0, update.id); // id
    dataView.setFloat32(2, update.position.x); // position.x
    dataView.setFloat32(6, update.position.y); // position.x
    dataView.setFloat32(10, update.position.z); // position.z
    dataView.setInt16(14, update.rotation.x * 32767); // quaternion.y
    dataView.setInt16(16, update.rotation.y * 32767); // quaternion.w
    dataView.setUint8(18, this.animationStateToByte(update.state)); // animationState
    return buffer;
  }

  decodeUpdate(buffer: ArrayBuffer): ClientUpdate {
    const dataView = new DataView(buffer);
    const id = dataView.getUint16(0); // id
    const x = dataView.getFloat32(2); // position.x
    const y = dataView.getFloat32(6); // position.y
    const z = dataView.getFloat32(10); // position.z
    const quaternionY = dataView.getInt16(14) / 32767; // quaternion.y
    const quaternionW = dataView.getInt16(16) / 32767; // quaternion.w
    const state = this.byteToAnimationState(dataView.getUint8(18)); // animationState
    const position = new Vector3(x, y, z);
    const rotation = new Vector2(quaternionY, quaternionW);
    return { id, position, rotation, state };
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

export { CharacterNetworkClient };
