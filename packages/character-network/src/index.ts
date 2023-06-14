
import WebSocket from "ws";








class Network {





    setInterval(this.sendPlayerUpdates.bind(this), 33);





























  connectClient(socket: WebSocket) {
    const id = this.codec.getId();
    // const welcomeMessage = { id };

    const connectMessage = JSON.stringify({ id, connected: true });
    socket.send(connectMessage);
    for (const { socket: otherSocket } of this.clients.values()) {
      if (otherSocket.readyState === WebSocket.OPEN) {
        otherSocket.send(connectMessage);

    }

    for (const { update } of this.clients.values()) {
      socket.send(this.codec.encodeUpdate(update));
    }

    this.clients.set(id, {
      socket: socket,
      update: { id, location: new Vector2(), rotation: new Vector2(), state: "idle" },
    });


      let update;


        const arrayBuffer = new Uint8Array(message).buffer;
        update = this.codec.decodeUpdate(arrayBuffer);
      } else {
        try {




        } catch (e) {
          console.log("Error parsing JSON message", message, e);


        return;
      }

      if (update) {
        update.id = id;
        this.clients.get(id)!.update = update;


          if (otherSocket !== socket && otherSocket.readyState === WebSocket.OPEN) {
            otherSocket.send(message);


      }


    socket.on("close", () => {
      this.clients.delete(id);
      this.codec.disposeId(id);
      const disconnectMessage = JSON.stringify({ id, disconnect: true });
      for (const { socket: otherSocket } of this.clients.values()) {
        if (otherSocket.readyState === WebSocket.OPEN) {
          otherSocket.send(disconnectMessage);
        }
      }
    });

















export { ServerCodec, Network, type AnimationState, type ClientUpdate, type TClient };
