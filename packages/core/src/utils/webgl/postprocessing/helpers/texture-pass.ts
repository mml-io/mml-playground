/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Texture, WebGLRenderer, WebGLRenderTarget } from "three";
import { RawShaderMaterial, UniformsUtils } from "three";

import { type TUniforms } from "../../types";
import CopyShader from "../shaders/copy-shader";

import FullScreenQuad from "./full-screen-quad";
import Pass from "./pass";

class TexturePass extends Pass {
  fsQuad: FullScreenQuad<any>;
  map: Texture;
  opacity: number;
  uniforms: TUniforms;
  material: RawShaderMaterial;
  override needsSwap = false;

  constructor(map: Texture, opacity?: number) {
    super();
    const shader = CopyShader;
    this.map = map;
    this.opacity = opacity !== undefined ? opacity : 1.0;
    this.uniforms = UniformsUtils.clone(shader.uniforms);
    this.material = new RawShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
    });
    this.needsSwap = false;
    this.fsQuad = new FullScreenQuad();
  }

  override render(
    renderer: WebGLRenderer,
    _writeBuffer: WebGLRenderTarget,
    readBuffer: WebGLRenderTarget,
    _deltaTime: number,
    _maskActive?: boolean,
  ): void {
    const oldAutoClear = renderer.autoClear;
    renderer.autoClear = false;

    this.fsQuad.material = this.material;

    this.uniforms.opacity!.value = this.opacity;
    this.uniforms.tDiffuse!.value = this.map;
    this.material.transparent = this.opacity < 1.0;

    renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);
    if (this.clear) renderer.clear();
    this.fsQuad.render(renderer);

    renderer.autoClear = oldAutoClear;
  }

  dispose() {
    this.material.dispose();
    this.fsQuad.dispose();
  }
}

export default TexturePass;
