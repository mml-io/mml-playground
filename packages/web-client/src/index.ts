import {
  CameraManager,
  CharacterDescription,
  CharacterManager,
  CharacterModelLoader,
  CharacterState,
  CollisionsManager,
  Composer,
  decodeCharacterAndCamera,
  getSpawnPositionInsideCircle,
  KeyInputManager,
  MMLCompositionScene,
  TimeManager,
  TweakPane,
} from "@mml-io/3d-web-client-core";
import { ChatNetworkingClient, FromClientChatMessage, TextChatUI } from "@mml-io/3d-web-text-chat";
import {
  UserNetworkingClient,
  UserNetworkingClientUpdate,
  WebsocketStatus,
} from "@mml-io/3d-web-user-networking";
import { VoiceChatManager } from "@mml-io/3d-web-voice-chat";
import {
  IMMLScene,
  LoadingProgressManager,
  registerCustomElementsToWindow,
  setGlobalMMLScene,
} from "mml-web";
import { AudioListener, Euler, Scene, Vector3 } from "three";

import hdrUrl from "./assets/hdr/industrial_sunset_2k.hdr";
import airAnimationFileUrl from "./assets/models/unreal-air.glb";
import idleAnimationFileUrl from "./assets/models/unreal-idle.glb";
import jogAnimationFileUrl from "./assets/models/unreal-jog.glb";
import meshFileUrl from "./assets/models/unreal-mesh.glb";
import sprintAnimationFileUrl from "./assets/models/unreal-run.glb";
import { LoadingScreen } from "./LoadingScreen";
import { Room } from "./Room";

const characterDescription: CharacterDescription = {
  airAnimationFileUrl,
  idleAnimationFileUrl,
  jogAnimationFileUrl,
  meshFileUrl,
  sprintAnimationFileUrl,
  modelScale: 1,
};

const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const host = window.location.host;
const userNetworkAddress = `${protocol}//${host}/network`;

export class App {
  private element: HTMLDivElement;
  private composer: Composer;
  private tweakPane: TweakPane;

  private scene = new Scene();
  private audioListener = new AudioListener();
  private characterModelLoader = new CharacterModelLoader();
  private timeManager = new TimeManager();
  private keyInputManager = new KeyInputManager();
  private characterManager: CharacterManager;
  private cameraManager: CameraManager;
  private collisionsManager = new CollisionsManager(this.scene);
  private mmlCompositionScene: MMLCompositionScene;
  private networkClient: UserNetworkingClient;
  private remoteUserStates = new Map<number, CharacterState>();

  private networkChat: ChatNetworkingClient | null = null;
  private textChatUI: TextChatUI | null = null;

  private voiceChatManager: VoiceChatManager | null = null;

  private readonly latestCharacterObject = {
    characterState: null as null | CharacterState,
  };
  private clientId: number | null = null;

  private initialLoadCompleted = false;
  private loadingProgressManager = new LoadingProgressManager();
  private loadingScreen: LoadingScreen;

  constructor() {
    document.addEventListener("mousedown", () => {
      if (this.audioListener.context.state === "suspended") {
        this.audioListener.context.resume();
      }
    });

    this.element = document.createElement("div");
    this.element.style.position = "absolute";
    this.element.style.width = "100%";
    this.element.style.height = "100%";
    document.body.appendChild(this.element);

    this.cameraManager = new CameraManager(this.element, this.collisionsManager);
    this.cameraManager.camera.add(this.audioListener);

    this.composer = new Composer(this.scene, this.cameraManager.camera, true);
    this.composer.useHDRI(hdrUrl);
    this.element.appendChild(this.composer.renderer.domElement);

    this.tweakPane = new TweakPane(
      this.composer.renderer,
      this.scene,
      this.composer.effectComposer,
    );
    this.composer.setupTweakPane(this.tweakPane);

    const resizeObserver = new ResizeObserver(() => {
      this.composer.fitContainer();
    });
    resizeObserver.observe(this.element);

    const initialNetworkLoadRef = {};
    this.loadingProgressManager.addLoadingAsset(initialNetworkLoadRef, "network", "network");
    this.networkClient = new UserNetworkingClient(
      userNetworkAddress,
      (url: string) => new WebSocket(url),
      (status: WebsocketStatus) => {
        if (status === WebsocketStatus.Disconnected || status === WebsocketStatus.Reconnecting) {
          // The connection was lost after being established - the connection may be re-established with a different client ID
          this.characterManager.clear();
          this.remoteUserStates.clear();
          this.clientId = null;
        }
      },
      (clientId: number) => {
        this.clientId = clientId;
        if (this.initialLoadCompleted) {
          // Already loaded - respawn the character
          this.spawnCharacter();
        } else {
          this.loadingProgressManager.completedLoadingAsset(initialNetworkLoadRef);
        }
      },
      (remoteClientId: number, userNetworkingClientUpdate: null | UserNetworkingClientUpdate) => {
        if (userNetworkingClientUpdate === null) {
          this.remoteUserStates.delete(remoteClientId);
        } else {
          this.remoteUserStates.set(remoteClientId, userNetworkingClientUpdate);
        }
      },
    );

    this.characterManager = new CharacterManager(
      this.composer,
      this.characterModelLoader,
      this.collisionsManager,
      this.cameraManager,
      this.timeManager,
      this.keyInputManager,
      this.remoteUserStates,
      (characterState: CharacterState) => {
        this.latestCharacterObject.characterState = characterState;
        this.networkClient.sendUpdate(characterState);
      },
    );
    this.scene.add(this.characterManager.group);

    const room = new Room();
    this.collisionsManager.addMeshesGroup(room);
    this.scene.add(room);

    this.setupMMLScene();

    this.loadingScreen = new LoadingScreen(this.loadingProgressManager);
    document.body.append(this.loadingScreen.element);

    this.loadingProgressManager.addProgressCallback(() => {
      const [, completed] = this.loadingProgressManager.toRatio();
      if (completed && !this.initialLoadCompleted) {
        this.initialLoadCompleted = true;
        /*
         When all content (in particular MML) has loaded, spawn the character (this is to avoid the character falling
         through as-yet-unloaded geometry)
        */
        this.connectToVoiceChat();
        this.connectToTextChat();
        this.spawnCharacter();
      }
    });
    this.loadingProgressManager.setInitialLoad(true);
  }

  private sendChatMessageToServer(message: string): void {
    this.mmlCompositionScene.onChatMessage(message);
    if (this.clientId === null || this.networkChat === null) return;
    const chatMessage: FromClientChatMessage = {
      type: "chat",
      id: this.clientId,
      text: message,
    };
    this.networkChat.sendUpdate(chatMessage);
  }

  private connectToVoiceChat() {
    if (this.clientId === null) return;

    if (this.voiceChatManager === null) {
      this.voiceChatManager = new VoiceChatManager(
        this.clientId,
        this.remoteUserStates,
        this.latestCharacterObject,
      );
    }
  }

  private connectToTextChat() {
    if (this.clientId === null) return;

    if (this.textChatUI === null) {
      this.textChatUI = new TextChatUI(
        this.clientId.toString(),
        this.sendChatMessageToServer.bind(this),
      );
      this.textChatUI.init();
    }

    if (this.networkChat === null) {
      this.networkChat = new ChatNetworkingClient(
        `${protocol}//${host}/chat-network?id=${this.clientId}`,
        (url: string) => new WebSocket(`${url}?id=${this.clientId}`),
        (status: WebsocketStatus) => {
          if (status === WebsocketStatus.Disconnected || status === WebsocketStatus.Reconnecting) {
            // The connection was lost after being established - the connection may be re-established with a different client ID
          }
        },
        (clientId: number, chatNetworkingUpdate: null | FromClientChatMessage) => {
          if (chatNetworkingUpdate !== null && this.textChatUI !== null) {
            this.textChatUI.addTextMessage(clientId.toString(), chatNetworkingUpdate.text);
          }
        },
      );
    }
  }

  public update(): void {
    this.timeManager.update();
    this.characterManager.update();
    this.voiceChatManager?.speakingParticipants.forEach((value: boolean, id: number) => {
      this.characterManager.setSpeakingCharacter(id, value);
    });
    this.cameraManager.update();
    this.composer.sun?.updateCharacterPosition(this.characterManager.localCharacter?.position);
    this.composer.render(this.timeManager);
    if (this.tweakPane.guiVisible) {
      this.tweakPane.updateStats(this.timeManager);
    }
    requestAnimationFrame(() => {
      this.update();
    });
  }

  private spawnCharacter() {
    if (this.clientId === null) {
      throw new Error("Client ID not set");
    }
    const spawnPosition = getSpawnPositionInsideCircle(3, 30, this.clientId!, 0.4);
    const spawnRotation = new Euler(0, 0, 0);
    let cameraPosition: Vector3 | null = null;
    if (window.location.hash && window.location.hash.length > 1) {
      const urlParams = decodeCharacterAndCamera(window.location.hash.substring(1));
      spawnPosition.copy(urlParams.character.position);
      spawnRotation.setFromQuaternion(urlParams.character.quaternion);
      cameraPosition = urlParams.camera.position;
    }
    this.characterManager.spawnCharacter(
      characterDescription,
      this.clientId!,
      true,
      spawnPosition,
      spawnRotation,
    );
    if (cameraPosition !== null) {
      this.cameraManager.camera.position.copy(cameraPosition);
      this.cameraManager.setTarget(
        new Vector3().add(spawnPosition).add(this.characterManager.headTargetOffset),
      );
      this.cameraManager.reverseUpdateFromPositions();
    }
  }

  private setupMMLScene() {
    registerCustomElementsToWindow(window);
    this.mmlCompositionScene = new MMLCompositionScene(
      this.element,
      this.composer.renderer,
      this.scene,
      this.cameraManager.camera,
      this.audioListener,
      this.collisionsManager,
      () => {
        return this.characterManager.getLocalCharacterPositionAndRotation();
      },
    );
    this.scene.add(this.mmlCompositionScene.group);
    setGlobalMMLScene(this.mmlCompositionScene.mmlScene as IMMLScene);

    const documentAddresses = [`${protocol}//${host}/playground`];
    for (const address of documentAddresses) {
      const frameElement = document.createElement("m-frame");
      frameElement.setAttribute("src", address);
      document.body.appendChild(frameElement);
    }

    const mmlProgressManager = this.mmlCompositionScene.mmlScene.getLoadingProgressManager!()!;
    this.loadingProgressManager.addLoadingDocument(mmlProgressManager, "mml", mmlProgressManager);
    mmlProgressManager.addProgressCallback(() => {
      this.loadingProgressManager.updateDocumentProgress(mmlProgressManager);
    });
    mmlProgressManager.setInitialLoad(true);
  }
}

const app = new App();
app.update();
