import "./style.css";

import {
  CharacterDescription,
  CharacterManager,
  CameraManager,
  Composer,
  InputManager,

  RunTime,
  Network,
} from "@mml-playground/core";
import { Scene, Fog, PerspectiveCamera, Group } from "three";

import { Lights } from "./lights";
import { Room } from "./room";

export class App {
  private runTime: RunTime;

  private scene: Scene;
  private group: Group;


  private inputManager: InputManager;

  private modelsPath: string = "/assets/models";

  private characterManager: CharacterManager = new CharacterManager();

  private cameraManager: CameraManager;
  private camera: PerspectiveCamera;
  private composer: Composer;

  private room: Room;
  private lights: Lights;

  private network: Network = new Network();

  private characterDescription: CharacterDescription | null = null;

  constructor() {
    this.runTime = new RunTime();
    this.inputManager = new InputManager();

    this.scene = new Scene();
    this.scene.fog = new Fog(0xb1b1b1, 0.1, 90);
    this.group = new Group();

    this.cameraManager = new CameraManager();
    this.camera = this.cameraManager.camera;
    this.composer = new Composer(this.scene, this.camera);
    this.mmlScene = new CoreMMLScene(
      this.group,
      document.body,
      this.composer.renderer,
      this.scene,
      this.camera,
    );
    this.mmlScene.init();

    this.room = new Room(this.scene, this.composer.renderer, (modelGroup) =>
      this.group.add(modelGroup),
    );
    this.lights = new Lights((subGroup) => this.group.add(subGroup));
    this.scene.add(this.group);

    this.characterDescription = {
      meshFileUrl: `${this.modelsPath}/unreal_idle.glb`,
      idleAnimationFileUrl: `${this.modelsPath}/unreal_idle.glb`,
      jogAnimationFileUrl: `${this.modelsPath}/unreal_jog.glb`,
      sprintAnimationFileUrl: `${this.modelsPath}/unreal_run.glb`,
    };

    this.init = this.init.bind(this);
    this.update = this.update.bind(this);
  }

  async init() {
    this.scene.add(this.group);

    // Get server connection details
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;

    // Connect to character network
    this.network.connection
      .connect(`${protocol}//${host}/network`)
      .then(() => {
        this.characterManager.spawnCharacter(
          this.characterDescription!,
          this.network.connection.clientId!,
          this.group,
          true,
        );
      })
      .catch(() => {
        this.characterManager.spawnCharacter(this.characterDescription!, 0, this.group, true);
      });

    // Load playground document
    document.getElementById("playground")?.setAttribute("src", `${protocol}//${host}/document`);
  }

  update(): void {
    this.runTime.update();

    this.characterManager.update(
      this.runTime,
      this.inputManager,
      this.cameraManager,
      this.composer,
      this.network,
      this.group,
    );

    this.cameraManager.update();

    this.composer.render(this.runTime.time);
    requestAnimationFrame(this.update);
  }
}

const app = new App();
app.init();
app.update();
