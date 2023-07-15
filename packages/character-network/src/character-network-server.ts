import { Vector2, Vector3 } from "three";
import WebSocket from "ws";

import { CharacterNetworkCodec } from "./character-network-codec";
import { heartBeatRate, packetsUpdateRate, pingPongRate } from "./character-network-settings";
import { Client, ClientUpdate } from "./types";

class CharacterNetworkServer {
  codec: CharacterNetworkCodec = new CharacterNetworkCodec();

  clients: Map<number, Client> = new Map();
  clientLastPong: Map<number, number> = new Map();

  constructor() {
    setInterval(this.sendPlayerUpdates.bind(this), packetsUpdateRate);
    setInterval(this.pingClients.bind(this), pingPongRate);
    setInterval(this.heartBeat.bind(this), heartBeatRate);
  }

  heartBeat() {
    const now = Date.now();
    this.clientLastPong.forEach((clientLastPong, id) => {
      if (now - clientLastPong > heartBeatRate) {
        this.clients.delete(id);
        this.clientLastPong.delete(id);
        const disconnectMessage = JSON.stringify({ id, disconnect: true });
        for (const { socket: otherSocket } of this.clients.values()) {
          if (otherSocket.readyState === WebSocket.OPEN) {
            otherSocket.send(disconnectMessage);
          }
        }
      }
    });
  }

  pingClients() {
    this.clients.forEach((client) => {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(JSON.stringify({ type: "ping" }));
      }
    });
  }

  getId(): number {
    let id = 1;
    while (this.clients.has(id)) id++;
    return id;
  }

  connectClient(socket: WebSocket) {
    const id = this.getId();

    const connectMessage = JSON.stringify({ id, connected: true });
    socket.send(connectMessage);
    for (const { socket: otherSocket } of this.clients.values()) {
      if (otherSocket.readyState === WebSocket.OPEN) {
        otherSocket.send(connectMessage);
      }
    }

    for (const { update } of this.clients.values()) {
      socket.send(this.codec.encodeUpdate(update));
    }

    this.clients.set(id, {
      socket: socket as WebSocket,
      update: { id, position: new Vector3(), rotation: new Vector2(), state: "idle" },
    });

    socket.on("message", (message: WebSocket.Data, _isBinary: boolean) => {
      let update;

      if (message instanceof Buffer) {
        const arrayBuffer = new Uint8Array(message).buffer;
        update = this.codec.decodeUpdate(arrayBuffer);
      } else {
        try {
          const data = JSON.parse(message as string);
          if (data.type === "pong") {
            this.clientLastPong.set(data.id, Date.now());
          }
        } catch (e) {
          console.log("Error parsing JSON message", message, e);
        }

        return;
      }

      if (update) {
        update.id = id;
        if (this.clients.get(id) !== undefined) {
          this.clients.get(id)!.update = update;

          for (const { socket: otherSocket } of this.clients.values()) {
            if (otherSocket !== socket && otherSocket.readyState === WebSocket.OPEN) {
              otherSocket.send(message);
            }
          }
        }
      }
    });

    socket.on("close", () => {
      this.clients.delete(id);
      const disconnectMessage = JSON.stringify({ id, disconnect: true });
      for (const { socket: otherSocket } of this.clients.values()) {
        if (otherSocket.readyState === WebSocket.OPEN) {
          otherSocket.send(disconnectMessage);
        }
      }
    });
  }

  sendPlayerUpdates(): void {
    const updates: ClientUpdate[] = [];
    this.clients.forEach((client) => {
      updates.push(client.update);
    });

    for (const update of updates) {
      const encodedUpdate = this.codec.encodeUpdate(update);
      this.clients.forEach((client) => {
        client.socket.send(encodedUpdate);
      });
    }
  }
}

export { CharacterNetworkServer };
