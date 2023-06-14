import type { Camera, Material, Scene, WebGLRenderer, WebGLRenderTarget } from "three";
import { Color } from "three";

import Pass from "./pass";

class RenderPass extends Pass {
  scene: Scene;
  camera: Camera;
  overrideMaterial: Material | undefined;
  clearColor: Color;
  clearAlpha: number;
  clearDepth: boolean;
  oldClearColor: Color;

  constructor(
    scene: Scene,
    camera: Camera,
    overrideMaterial?: Material | undefined,
    clearColor?: Color,
    clearAlpha = 0,
  ) {
    super();

    this.scene = scene;
    this.camera = camera;
    this.overrideMaterial = overrideMaterial;
    this.clearColor = clearColor !== undefined ? clearColor : new Color();
    this.clearAlpha = clearAlpha !== undefined ? clearAlpha : 0;
    this.clear = true;
    this.clearDepth = false;
    this.needsSwap = false;
    this.oldClearColor = new Color();
  }

  override render(
    renderer: WebGLRenderer,
    _writeBuffer: WebGLRenderTarget,
    readBuffer: WebGLRenderTarget,
    _deltaTime?: number,
    _maskActive?: boolean,
  ): void {
    const oldAutoClear = renderer.autoClear;
    renderer.autoClear = false;

    let oldClearAlpha;
    let oldOverrideMaterial: Material | null = null;

    if (this.overrideMaterial !== undefined) {
      oldOverrideMaterial = this.scene.overrideMaterial;
      this.scene.overrideMaterial = this.overrideMaterial;
    }

    if (this.clearColor) {
      renderer.getClearColor(this.oldClearColor);
      oldClearAlpha = renderer.getClearAlpha();
      renderer.setClearColor(this.clearColor, this.clearAlpha);
    }

    if (this.clearDepth) {
      renderer.clearDepth();
    }

    renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);

    if (this.clear) {
      renderer.clear(renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil);
    }
    renderer.render(this.scene, this.camera);

    if (this.clearColor) {
      renderer.setClearColor(this.oldClearColor, oldClearAlpha);
    }

    if (this.overrideMaterial !== undefined) {
      this.scene.overrideMaterial = oldOverrideMaterial;
    }

    renderer.autoClear = oldAutoClear;
  }
}

export default RenderPass;
