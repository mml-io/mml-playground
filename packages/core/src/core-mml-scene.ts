/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  IMMLScene,





  registerCustomElementsToWindow,

  setGlobalMScene,
} from "mml-web";
import { AudioListener, Group, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from "three";


  private mmlScene: Partial<IMMLScene>;
  private scenePosition: ScenePosition;









    camera: PerspectiveCamera,


    this.scenePosition = {
      location: camera.position,
      orientation: new Vector3(camera.rotation.x, camera.rotation.y, camera.rotation.z),
    };


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


    setGlobalMScene(this.mmlScene as IMMLScene);
    registerCustomElementsToWindow(window);
    this.clickTrigger = MMLClickTrigger.init(
      document,
      this.elementsHolder,
      this.mmlScene as IMMLScene,
    );

  }
}
