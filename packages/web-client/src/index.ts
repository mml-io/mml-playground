import { Networked3dWebExperienceClient } from "@mml-io/3d-web-experience-client";
import { MMLWorldConfig } from "@mml-io/esbuild-plugin-mml";

const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const host = window.location.host;
const userNetworkAddress = `${protocol}//${host}/network`;
const chatNetworkAddress = `${protocol}//${host}/chat-network`;

fetch("/web-client/world.json")
  .then((response) => response.json())
  .then((worldConfig: MMLWorldConfig) => {
    const holder = Networked3dWebExperienceClient.createFullscreenHolder();
    const app = new Networked3dWebExperienceClient(holder, {
      sessionToken: (window as any).SESSION_TOKEN,
      userNetworkAddress,
      chatNetworkAddress,
      animationConfig: {
        airAnimationFileUrl: "./assets/models/anim_air.glb",
        idleAnimationFileUrl: "./assets/models/anim_idle.glb",
        jogAnimationFileUrl: "./assets/models/anim_jog.glb",
        sprintAnimationFileUrl: "./assets/models/anim_run.glb",
        doubleJumpAnimationFileUrl: "./assets/models/anim_double_jump.glb",
      },
      skyboxHdrJpgUrl: "./assets/hdr/puresky_2k.jpg",
      mmlDocuments: Object.values(worldConfig.mmlDocuments),
    });
    app.update();
  });
