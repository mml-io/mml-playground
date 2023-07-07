import {
  IMMLScene,
  Interaction,
  InteractionListener,
  InteractionManager,
  MMLClickTrigger,
  PromptManager,
  PromptProps,
  registerCustomElementsToWindow,
  setGlobalMScene,
  ScenePosition,
} from "mml-web";
import { AudioListener, Group, Object3D, PerspectiveCamera, Scene, WebGLRenderer } from "three";

import { CollisionsManager } from "../collisions/collisions-manager";

export class CoreMMLScene {
  private debug: boolean = false;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private mmlScene: Partial<IMMLScene>;
  private getUserPositionAndRotation: () => ScenePosition;
  private promptManager: PromptManager;
  private interactionListener: InteractionListener;
  private elementsHolder: HTMLElement;
  private audioListener: AudioListener;
  private clickTrigger: MMLClickTrigger;
  private collisionsManager: CollisionsManager;

  constructor(
    group: Group,
    elementsHolder: HTMLElement,
    renderer: WebGLRenderer,
    scene: Scene,
    camera: PerspectiveCamera,
    collisionsManager: CollisionsManager,
    getUserPositionAndRotation: () => ScenePosition,
  ) {
    this.scene = scene;
    this.camera = camera;
    this.elementsHolder = elementsHolder;
    this.collisionsManager = collisionsManager;
    this.promptManager = PromptManager.init(document.body);

    const { interactionListener } = InteractionManager.init(document.body, this.camera, this.scene);
    this.interactionListener = interactionListener;
    this.getUserPositionAndRotation = getUserPositionAndRotation;

    this.audioListener = new AudioListener();

    document.addEventListener("mousedown", this.onMouseDown.bind(this));

    this.mmlScene = {
      getAudioListener: () => this.audioListener,
      getRenderer: () => renderer,
      getThreeScene: () => scene,
      getRootContainer: () => group,
      getCamera: () => camera,
      addCollider: (object: Object3D) => {
        this.collisionsManager.addMeshesGroup(object as Group);
      },
      updateCollider: (object: Object3D) => {
        this.collisionsManager.updateMeshesGroup(object as Group);
      },
      removeCollider: (object: Object3D) => {
        this.collisionsManager.removeMeshesGroup(object as Group);
      },
      getUserPosition: this.getUserPositionAndRotation,
      addInteraction: (interaction: Interaction) => {
        this.interactionListener.addInteraction(interaction);
      },
      updateInteraction: (interaction: Interaction) => {
        this.interactionListener.updateInteraction(interaction);
      },
      removeInteraction: (interaction: Interaction) => {
        this.interactionListener.removeInteraction(interaction);
      },
      prompt: (promptProps: PromptProps, callback: (message: string | null) => void) => {
        this.promptManager.prompt(promptProps, callback);
      },
    };
    setGlobalMScene(this.mmlScene as IMMLScene);
    registerCustomElementsToWindow(window);
    this.clickTrigger = MMLClickTrigger.init(
      document,
      this.elementsHolder,
      this.mmlScene as IMMLScene,
    );
    if (this.debug) console.log(this.clickTrigger);
  }

  onMouseDown() {
    if (this.audioListener.context.state === "suspended") {
      this.audioListener.context.resume();
    }
  }

  traverseDOM(node: Node | null, callback: (node: Node) => void): void {
    if (node === null) return;
    const notGarbage = node.nodeType !== 3 && node.nodeType !== 8;
    const isMML = node.nodeName.toLowerCase().includes("m-");
    if (notGarbage) {
      if (isMML) callback(node);
      let childNode = node.firstChild;
      while (childNode) {
        this.traverseDOM(childNode, callback);
        childNode = childNode.nextSibling;
      }
    }
  }
}
