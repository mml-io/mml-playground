










} from "@mml-playground/core";



import { Room } from "./room";


















  private room: Room;

















    this.mmlScene = new CoreMMLScene(
      this.group,
      document.body,
      this.composer.renderer,
      this.scene,
      this.camera,
    );


    this.room = new Room(this.scene, this.composer.renderer, (modelGroup) =>
      this.group.add(modelGroup),
    );

















    // Get server connection details
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;

    // Connect to character network

      .connect(`${protocol}//${host}/network`)





          true,






    // Load playground document
    document.getElementById("playground")?.setAttribute("src", `${protocol}//${host}/document`);











      this.group,












