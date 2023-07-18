import { CharacterNetworkClient } from "@mml-playground/character-network";
import {
  CameraManager,
  CharacterDescription,
  CharacterManager,
  CollisionsManager,
  Composer,
  CoreMMLScene,
  KeyInputManager,
  RunTimeManager,
} from "@mml-playground/core";
import { AudioListener, Fog, Group, PerspectiveCamera, Scene } from "three";

import { Environment } from "./Environment";
import { Lights } from "./Lights";
import { Room } from "./Room";

export class App {
  private readonly group: Group;
  private readonly scene: Scene;
  private readonly audioListener: AudioListener;
  private readonly composer: Composer;

  private readonly camera: PerspectiveCamera;
  private readonly runTimeManager: RunTimeManager;
  private readonly keyInputManager: KeyInputManager;
  private readonly characterManager: CharacterManager;
  private readonly cameraManager: CameraManager;
  private readonly collisionsManager: CollisionsManager;
  private readonly networkClient: CharacterNetworkClient;

  private readonly modelsPath: string = "/web-client/assets/models";
  private readonly characterDescription: CharacterDescription | null = null;

  constructor() {
    this.scene = new Scene();
    this.scene.fog = new Fog(0xdcdcdc, 0.1, 100);
    this.audioListener = new AudioListener();
    this.group = new Group();
    this.scene.add(this.group);

    this.runTimeManager = new RunTimeManager();
    this.keyInputManager = new KeyInputManager();
    this.cameraManager = new CameraManager();
    this.camera = this.cameraManager.camera;
    this.camera.add(this.audioListener);
    this.composer = new Composer(this.scene, this.camera);
    this.networkClient = new CharacterNetworkClient();
    this.collisionsManager = new CollisionsManager(this.scene);
    this.characterManager = new CharacterManager(
      this.collisionsManager,
      this.cameraManager,
      this.runTimeManager,
      this.keyInputManager,
      this.networkClient,
    );
    this.group.add(this.characterManager.group);

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;

    const mmlScene = new CoreMMLScene(
      this.composer.renderer,
      this.scene,
      this.camera,
      this.audioListener,
      this.collisionsManager,
      () => {
        return this.characterManager.getLocalCharacterPositionAndRotation();
      },
      `${protocol}//${host}/document`,
    );
    this.group.add(mmlScene.group);
    this.group.add(new Environment(this.scene, this.composer.renderer));
    this.group.add(new Lights());

    const room = new Room();
    this.collisionsManager.addMeshesGroup(room);
    this.group.add(room);

    this.characterDescription = {
      meshFileUrl: `${this.modelsPath}/unreal_idle.glb`,
      idleAnimationFileUrl: `${this.modelsPath}/unreal_idle.glb`,
      jogAnimationFileUrl: `${this.modelsPath}/unreal_jog.glb`,
      sprintAnimationFileUrl: `${this.modelsPath}/unreal_run.glb`,
      modelScale: 1.0,
    };
  }

  async init() {
    this.scene.add(this.group);

    document.addEventListener("mousedown", () => {
      if (this.audioListener.context.state === "suspended") {
        this.audioListener.context.resume();
      }
    });

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    this.networkClient.connection
      .connect(`${protocol}//${host}/network`)
      .then(() => {
        this.characterManager.spawnCharacter(
          this.characterDescription!,
          this.networkClient.connection.clientId!,
          this.group,
          true,
        );
      })
      .catch(() => {
        this.characterManager.spawnCharacter(this.characterDescription!, 0, this.group, true);
      });
  }

  public update(): void {
    this.runTimeManager.update();
    this.characterManager.update();
    this.cameraManager.update();
    this.composer.render(this.runTimeManager.time);
    requestAnimationFrame(() => {
      this.update();
    });
  }
}

const app = new App();
app.init();
app.update();
