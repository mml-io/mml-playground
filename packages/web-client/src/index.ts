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
  CharacterModelLoader,
} from "@mml-io/3d-web-client-core";
import { ChatNetworkingClient, FromClientChatMessage, TextChatUI } from "@mml-io/3d-web-text-chat";
import {
  UserNetworkingClient,
  UserNetworkingClientUpdate,
  WebsocketStatus,
} from "@mml-io/3d-web-user-networking";
import { VoiceChatManager } from "@mml-io/3d-web-voice-chat";
import { IMMLScene, registerCustomElementsToWindow, setGlobalMMLScene } from "mml-web";
import { AudioListener, Group, PerspectiveCamera, Scene } from "three";

import { Room } from "./Room";

export class App {
  private readonly group: Group;
  private readonly scene: Scene;
  private readonly audioListener: AudioListener;
  private readonly characterModelLoader = new CharacterModelLoader();
  private readonly composer: Composer;
  private readonly camera: PerspectiveCamera;
  private readonly timeManager: TimeManager;
  private readonly keyInputManager: KeyInputManager;
  private readonly characterManager: CharacterManager;
  private readonly cameraManager: CameraManager;
  private readonly collisionsManager: CollisionsManager;
  private readonly mmlCompositionScene: MMLCompositionScene;
  private readonly networkClient: UserNetworkingClient;

  private readonly remoteUserStates = new Map<number, CharacterState>();
  private readonly modelsPath: string = "/web-client/assets/models";
  private readonly characterDescription: CharacterDescription | null = null;

  private networkChat: ChatNetworkingClient | null = null;

  private clientId: number | null = null;
  private textChatUI: TextChatUI | null = null;

  private voiceChatManager: VoiceChatManager | null = null;
  private latestCharacterObject = {
    characterState: null as null | CharacterState,
  };

  private readonly protocol: string = window.location.protocol === "https:" ? "wss:" : "ws:";
  private readonly host: string = window.location.host;

  constructor() {
    registerCustomElementsToWindow(window);

    this.scene = new Scene();
    this.collisionsManager = new CollisionsManager(this.scene);

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

    const composerHolderElement = document.createElement("div");
    composerHolderElement.style.position = "absolute";
    composerHolderElement.style.width = "100%";
    composerHolderElement.style.height = "100%";
    document.body.appendChild(composerHolderElement);

    this.cameraManager = new CameraManager(composerHolderElement, this.collisionsManager);
    this.camera = this.cameraManager.camera;
    this.camera.add(this.audioListener);
    this.composer = new Composer(this.scene, this.camera, true);
    this.composer.useHDRI("/web-client/assets/hdr/industrial_sunset_2k.hdr");
    composerHolderElement.appendChild(this.composer.renderer.domElement);

    const resizeObserver = new ResizeObserver(() => {
      this.composer.fitContainer();
    });
    resizeObserver.observe(composerHolderElement);

    this.characterDescription = {
      meshFileUrl: `${this.modelsPath}/unreal-mesh.glb`,
      idleAnimationFileUrl: `${this.modelsPath}/unreal-idle.glb`,
      jogAnimationFileUrl: `${this.modelsPath}/unreal-jog.glb`,
      sprintAnimationFileUrl: `${this.modelsPath}/unreal-run.glb`,
      airAnimationFileUrl: `${this.modelsPath}/unreal-air.glb`,
      modelScale: 1,
    };

    this.networkClient = new UserNetworkingClient(
      `${this.protocol}//${this.host}/network`,
      (url: string) => new WebSocket(url),
      (status: WebsocketStatus) => {
        if (status === WebsocketStatus.Disconnected || status === WebsocketStatus.Reconnecting) {
          // The connection was lost after being established - the connection may be re-established with a different client ID
          this.characterManager.clear();
          this.remoteUserStates.clear();
        }
      },
      (clientId: number) => {
        this.clientId = clientId;
        this.connectToTextChat();
        if (this.voiceChatManager === null) {
          this.voiceChatManager = new VoiceChatManager(
            clientId,
            this.remoteUserStates,
            this.latestCharacterObject,
          );
        }
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
    this.group.add(this.characterManager.group);

    this.mmlCompositionScene = new MMLCompositionScene(
      composerHolderElement,
      this.composer.renderer,
      this.scene,
      this.camera,
      this.audioListener,
      this.collisionsManager,
      () => {
        return this.characterManager.getLocalCharacterPositionAndRotation();
      },
    );
    this.group.add(this.mmlCompositionScene.group);
    setGlobalMMLScene(this.mmlCompositionScene.mmlScene as IMMLScene);

    const documentAddresses = [`${this.protocol}//${this.host}/playground`];
    for (const address of documentAddresses) {
      const frameElement = document.createElement("m-frame");
      frameElement.setAttribute("src", address);
      document.body.appendChild(frameElement);
    }

    const room = new Room();
    this.collisionsManager.addMeshesGroup(room);
    this.group.add(room);
  }

  private sendMessageToServer(message: string): void {
    if (this.clientId === null || this.networkChat === null) return;
    const chatMessage: FromClientChatMessage = {
      type: "chat",
      id: this.clientId,
      text: message,
    };
    this.networkChat.sendUpdate(chatMessage);
  }

  private connectToTextChat() {
    if (this.clientId === null) return;

    if (this.textChatUI === null) {
      this.textChatUI = new TextChatUI(
        this.clientId.toString(),
        this.sendMessageToServer.bind(this),
      );
      this.textChatUI.init();
    }

    if (this.networkChat === null) {
      this.networkChat = new ChatNetworkingClient(
        `${this.protocol}//${this.host}/chat-network?id=${this.clientId}`,
        (url: string) => new WebSocket(`${url}?id=${this.clientId}`),
        (status: WebsocketStatus) => {
          if (status === WebsocketStatus.Disconnected || status === WebsocketStatus.Reconnecting) {
            // The connection was lost after being established - the connection may be re-established with a different client ID
            this.characterManager.clear();
            this.remoteUserStates.clear();
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
    if (this.composer.sun) {
      this.composer.sun.updateCharacterPosition(this.characterManager.character?.position);
    }
    this.composer.render(this.timeManager);
    requestAnimationFrame(() => {
      this.update();
    });
  }
}

const app = new App();
app.update();
