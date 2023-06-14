import type { WebGLRenderer, WebGLRenderTarget } from "three";

import Pass from "./pass";

export default class ClearMaskPass extends Pass {
  constructor() {
    super();
    this.needsSwap = false;
  }

  override render(
    renderer: WebGLRenderer,
    _writeBuffer?: WebGLRenderTarget,
    _readBuffer?: WebGLRenderTarget,
    _delta?: number,
    _maskActive?: boolean,
  ): void {
    renderer.state.buffers.stencil.setTest(false);
  }
}
