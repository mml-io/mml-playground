/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  IMMLScene,
  Interaction,
  InteractionManager,
  MMLClickTrigger,
  PromptManager,
  PromptProps,
  registerCustomElementsToWindow,
  ScenePosition,
  setGlobalMScene,
} from "mml-web";
import { AudioListener, Group, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from "three";

export class CoreMMLScene {
  private mmlScene: Partial<IMMLScene>;
  private scenePosition: ScenePosition;
  private clickTrigger: MMLClickTrigger;
  private promptManager: PromptManager;
  private elementsHolder: HTMLElement;

  constructor(
    group: Group,
    elementsHolder: HTMLElement,
    renderer: WebGLRenderer,
    scene: Scene,
    camera: PerspectiveCamera,
  ) {
    this.elementsHolder = elementsHolder;
    this.scenePosition = {
      location: camera.position,
      orientation: new Vector3(camera.rotation.x, camera.rotation.y, camera.rotation.z),
    };
    const { interactionListener } = InteractionManager.init(camera, scene);

    this.mmlScene = {
      getAudioListener: () => new AudioListener(),
      getRenderer: () => renderer,
      getThreeScene: () => scene,
      getRootContainer: () => group,
      getCamera: () => camera,
      getUserPosition: () => this.scenePosition,
      addCollider: () => {},
      updateCollider: () => {},
      removeCollider: () => {},
      addInteraction: (interaction: Interaction) => {
        interactionListener.addInteraction(interaction);
      },
      updateInteraction: (interaction: Interaction) => {
        interactionListener.updateInteraction(interaction);
      },
      removeInteraction: (interaction: Interaction) => {
        interactionListener.removeInteraction(interaction);
      },
      prompt: (promptProps: PromptProps, callback: (message: string | null) => void) => {
        this.promptManager.prompt(promptProps, callback);
      },
    };
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

  public init() {
    setGlobalMScene(this.mmlScene as IMMLScene);
    registerCustomElementsToWindow(window);
    this.clickTrigger = MMLClickTrigger.init(
      document,
      this.elementsHolder,
      this.mmlScene as IMMLScene,
    );
    this.promptManager = PromptManager.init(document.body);
  }
}
