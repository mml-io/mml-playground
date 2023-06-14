import type { WebGLRenderer, WebGLRenderTarget } from "three";

class Pass {
  public enabled = true;
  public needsSwap = true;
  public clear = false;
  public renderToScreen = false;

  public setSize(_width: number, _height: number): void {}

  public render(
    _renderer: WebGLRenderer,
    _writeBuffer: WebGLRenderTarget,
    _readBuffer: WebGLRenderTarget,
    _delta: number,
    _maskActive?: boolean,
  ): void {}
}

export default Pass;
