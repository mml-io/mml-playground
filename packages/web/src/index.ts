import "./style.css";

import {
  CharacterDescription,
  CharacterManager,
  CameraManager,
  Composer,
  InputManager,
  CoreMMLScene,
  RunTimeManager,
  Network,
} from "@mml-playground/core";
import { CollisionsManager } from "@mml-playground/core/src";
import { Scene, Fog, PerspectiveCamera, Group } from "three";

import { Environment } from "./environment";
import { Lights } from "./lights";
import { Room } from "./room";

export class App {
  private group: Group;
  private scene: Scene;
  private camera: PerspectiveCamera;

  private runTime: RunTimeManager;
  private inputManager: InputManager;
  private characterManager: CharacterManager;
  private cameraManager: CameraManager;
  private composer: Composer;
  private network: Network;
  private collisionsManager: CollisionsManager;

  private modelsPath: string = "/assets/models";
  private characterDescription: CharacterDescription | null = null;

  constructor() {
    this.group = new Group();
    this.scene = new Scene();
    this.scene.fog = new Fog(0xdcdcdc, 0.1, 100);

    this.runTime = new RunTimeManager();
    this.inputManager = new InputManager();
    this.cameraManager = new CameraManager();
    this.camera = this.cameraManager.camera;
    this.composer = new Composer(this.scene, this.camera);
    this.network = new Network();
    this.collisionsManager = new CollisionsManager(this.scene);
    this.characterManager = new CharacterManager(this.collisionsManager);

    new CoreMMLScene(
      this.group,
      document.body,
      this.composer.renderer,
      this.scene,
      this.camera,
      this.collisionsManager,
      () => {
        const characterPosition = this.characterManager.getLocalCharacterPositionAndRotation();
        if (characterPosition) {
          return characterPosition;
        }
        return {
          location: { x: 0, y: 0, z: 0 },
          orientation: { x: 0, y: 0, z: 0 },
        };
      },
    );

    new Environment(this.scene, this.composer.renderer, (modelGroup) => this.group.add(modelGroup));
    new Room((modelGroup) => {
      this.collisionsManager.addMeshesGroup(modelGroup);
      this.group.add(modelGroup);
    });
    new Lights((subGroup) => this.group.add(subGroup));

    this.scene.add(this.group);

    this.characterDescription = {
      meshFileUrl: `${this.modelsPath}/unreal_idle.glb`,
      idleAnimationFileUrl: `${this.modelsPath}/unreal_idle.glb`,
      jogAnimationFileUrl: `${this.modelsPath}/unreal_jog.glb`,
      sprintAnimationFileUrl: `${this.modelsPath}/unreal_run.glb`,
      modelScale: 1.0,
    };

    this.init = this.init.bind(this);
    this.update = this.update.bind(this);
  }

  traverse(group: Group | Scene) {
    group.traverse((child) => {
      if (child.type === "Mesh") {
        console.log(child);
      } else if (child.type === "Group") {
        console.log(child);
      }
    });
  }

  async init() {
    this.scene.add(this.group);

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    this.network.connection
      .connect(`${protocol}//${host}/network`)
      .then(() => {
        this.characterManager.spawnCharacter(
          this.characterDescription!,
          this.network.connection.clientId!,
          this.group,
          true,
        );
        document.getElementById("playground")?.setAttribute("src", `${protocol}//${host}/document`);
      })
      .catch(() => {
        this.characterManager.spawnCharacter(this.characterDescription!, 0, this.group, true);
      });
  }

  update(): void {
    this.runTime.update();

    this.characterManager.update(
      this.runTime,
      this.inputManager,
      this.cameraManager,
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
