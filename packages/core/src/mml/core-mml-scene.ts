import {
  IMMLScene,
  Interaction,
  InteractionManager,
  MMLClickTrigger,
  PromptManager,
  InteractionListener,
  PromptProps,
  registerCustomElementsToWindow,
  ScenePosition,
  setGlobalMScene,
} from "mml-web";
import { AudioListener, Group, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from "three";

export class CoreMMLScene {
  private debug: boolean = false;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private mmlScene: Partial<IMMLScene>;
  private scenePosition: ScenePosition;
  private promptManager: PromptManager;
  private interactionListener: InteractionListener;
  private elementsHolder: HTMLElement;
  private audioListener: AudioListener;
  private clickTrigger: MMLClickTrigger;

  constructor(
    group: Group,
    elementsHolder: HTMLElement,
    renderer: WebGLRenderer,
    scene: Scene,
    camera: PerspectiveCamera,
  ) {
    this.scene = scene;
    this.camera = camera;
    this.elementsHolder = elementsHolder;
    this.scenePosition = {
      location: camera.position,
      orientation: new Vector3(camera.rotation.x, camera.rotation.y, camera.rotation.z),
    };
    this.promptManager = PromptManager.init(document.body);

    const { interactionListener } = InteractionManager.init(document.body, this.camera, this.scene);
    this.interactionListener = interactionListener;

    this.audioListener = new AudioListener();

    document.addEventListener("mousedown", this.onMouseDown.bind(this));

    this.mmlScene = {
      getAudioListener: () => this.audioListener,
      getRenderer: () => renderer,
      getThreeScene: () => scene,
      getRootContainer: () => group,
      getCamera: () => camera,
      getUserPosition: () => this.scenePosition,
      addCollider: () => {},
      updateCollider: () => {},
      removeCollider: () => {},
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
