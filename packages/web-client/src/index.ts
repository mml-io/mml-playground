import {
  CameraManager,
  CharacterDescription,
  CharacterManager,
  CharacterState,
  CollisionsManager,
  Composer,
  MMLCompositionScene,
  KeyInputManager,
  TimeManager,
} from "@mml-io/3d-web-client-core";
import {
  UserNetworkingClient,
  UserNetworkingClientUpdate,
  WebsocketStatus,
} from "@mml-io/3d-web-user-networking";
import { AudioListener, Fog, Group, PerspectiveCamera, Scene } from "three";

import { Room } from "./Room";
import { Sun } from "./Sun";

export class App {
  private readonly group: Group;
  private readonly scene: Scene;
  private readonly audioListener: AudioListener;
  private readonly composer: Composer;
  private readonly camera: PerspectiveCamera;
  private readonly timeManager: TimeManager;
  private readonly keyInputManager: KeyInputManager;
  private readonly characterManager: CharacterManager;
  private readonly cameraManager: CameraManager;
  private readonly collisionsManager: CollisionsManager;
  private readonly networkClient: UserNetworkingClient;

  private readonly remoteUserStates = new Map<number, CharacterState>();
  private readonly modelsPath: string = "/web-client/assets/models";
  private readonly characterDescription: CharacterDescription | null = null;

  private readonly sun: Sun;

  constructor() {
    this.scene = new Scene();
    this.scene.fog = new Fog(0xc7cad0, 30, 210);

    this.audioListener = new AudioListener();

    document.addEventListener("mousedown", () => {
      if (this.audioListener.context.state === "suspended") {
        this.audioListener.context.resume();
      }
    });

    this.group = new Group();
    this.scene.add(this.group);

    this.timeManager = new TimeManager();
    this.keyInputManager = new KeyInputManager();
    this.cameraManager = new CameraManager();
    this.camera = this.cameraManager.camera;
    this.camera.add(this.audioListener);
    this.composer = new Composer(this.scene, this.camera);
    this.composer.useHDRI("/web-client/assets/hdr/industrial_sunset_2k.hdr");

    this.characterDescription = {
      meshFileUrl: `${this.modelsPath}/unreal-mesh.glb`,
      idleAnimationFileUrl: `${this.modelsPath}/unreal-idle.glb`,
      jogAnimationFileUrl: `${this.modelsPath}/unreal-jog.glb`,
      sprintAnimationFileUrl: `${this.modelsPath}/unreal-run.glb`,
      airAnimationFileUrl: `${this.modelsPath}/unreal-air.glb`,
      modelScale: 1,
    };

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    this.networkClient = new UserNetworkingClient(
      `${protocol}//${host}/network`,
      (url: string) => new WebSocket(url),
      (status: WebsocketStatus) => {
        if (status === WebsocketStatus.Disconnected || status === WebsocketStatus.Reconnecting) {
          // The connection was lost after being established - the connection may be re-established with a different client ID
          this.characterManager.clear();
          this.remoteUserStates.clear();
        }
      },
      (clientId: number) => {
        this.characterManager.spawnCharacter(this.characterDescription!, clientId, true);
      },
      (clientId: number, userNetworkingClientUpdate: null | UserNetworkingClientUpdate) => {
        if (userNetworkingClientUpdate === null) {
          this.remoteUserStates.delete(clientId);
        } else {
          this.remoteUserStates.set(clientId, userNetworkingClientUpdate);
        }
      },
    );

    this.collisionsManager = new CollisionsManager(this.scene);
    this.characterManager = new CharacterManager(
      this.collisionsManager,
      this.cameraManager,
      this.timeManager,
      this.keyInputManager,
      this.remoteUserStates,
      (characterState: CharacterState) => {
        this.networkClient.sendUpdate(characterState);
      },
    );
    this.group.add(this.characterManager.group);

    const mmlComposition = new MMLCompositionScene(
      this.composer.renderer,
      this.scene,
      this.camera,
      this.audioListener,
      this.collisionsManager,
      () => {
        return this.characterManager.getLocalCharacterPositionAndRotation();
      },
      [`${protocol}//${host}/playground`],
    );

    this.group.add(mmlComposition.group);
    this.sun = new Sun();
    this.group.add(this.sun);

    const room = new Room();
    this.collisionsManager.addMeshesGroup(room);
    this.group.add(room);
  }

  public update(): void {
    this.timeManager.update();
    this.characterManager.update();
    this.cameraManager.update();
    this.sun.updateCharacterPosition(this.characterManager.character?.position);
    this.composer.render(this.timeManager);
    requestAnimationFrame(() => {
      this.update();
    });
  }
}

const app = new App();
app.update();
