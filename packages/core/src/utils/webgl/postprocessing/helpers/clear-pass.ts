import { Color, type WebGLRenderer, type WebGLRenderTarget } from "three";

import Pass from "./pass";

export default class ClearPass extends Pass {
  clearColor: Color = new Color(0x000000);
  clearAlpha = 0;
  _oldClearColor: Color;
  constructor(clearColor?: Color, clearAlpha?: number) {
    super();
    this.needsSwap = false;
    this.clearColor = clearColor !== undefined ? clearColor : this.clearColor;
    this.clearAlpha = clearAlpha !== undefined ? clearAlpha : 0;
    this._oldClearColor = new Color();
  }

  override render(
    renderer: WebGLRenderer,
    _writeBuffer?: WebGLRenderTarget,
    _readBuffer?: WebGLRenderTarget,
    _delta?: number,
    _maskActive?: boolean,
  ): void {
    let oldClearAlpha;
    if (this.clearColor) {
      renderer.getClearColor(this._oldClearColor);
      oldClearAlpha = renderer.getClearAlpha();
      renderer.setClearColor(this.clearColor, this.clearAlpha);
    }
    renderer.setRenderTarget(this.renderToScreen ? null : _readBuffer!);
    renderer.clear();
    if (this.clearColor) {
      renderer.setClearColor(this._oldClearColor, oldClearAlpha);
    }
  }
}
