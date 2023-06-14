import type { IUniform, WebGLRenderer } from "three";
import {
  MeshBasicMaterial,
  NearestFilter,
  RawShaderMaterial,
  UniformsUtils,
  WebGLRenderTarget,
} from "three";

import FullScreenQuad from "./helpers/full-screen-quad";
import Pass from "./helpers/pass";
import AfterimageShader from "./shaders/after-image-shader";

export default class AfterimagePass extends Pass {
  uniforms: Record<string, IUniform>;
  textureComp: WebGLRenderTarget;
  textureOld: WebGLRenderTarget;
  shaderMaterial: RawShaderMaterial;
  compFsQuad: FullScreenQuad<any>;
  copyFsQuad: FullScreenQuad<MeshBasicMaterial>;

  constructor(damp = 0.96) {
    super();
    this.uniforms = UniformsUtils.clone(AfterimageShader.uniforms);
    this.uniforms.damp!.value = damp;

    this.textureComp = new WebGLRenderTarget(window.innerWidth, window.innerHeight, {
      magFilter: NearestFilter,
    });

    this.textureOld = new WebGLRenderTarget(window.innerWidth, window.innerHeight, {
      magFilter: NearestFilter,
    });

    this.shaderMaterial = new RawShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: AfterimageShader.vertexShader,
      fragmentShader: AfterimageShader.fragmentShader,
    });

    this.compFsQuad = new FullScreenQuad(this.shaderMaterial);
    const material = new MeshBasicMaterial();
    this.copyFsQuad = new FullScreenQuad(material);
  }

  override render(
    renderer: WebGLRenderer,
    writeBuffer: WebGLRenderTarget,
    readBuffer: WebGLRenderTarget,
  ) {
    this.uniforms.tOld!.value = this.textureOld.texture;
    this.uniforms.tNew!.value = readBuffer.texture;

    renderer.setRenderTarget(this.textureComp);
    this.compFsQuad.render(renderer);
    this.copyFsQuad.material.map = this.textureComp.texture;

    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
      this.copyFsQuad.render(renderer);
    } else {
      renderer.setRenderTarget(writeBuffer);
      if (this.clear) renderer.clear();
      this.copyFsQuad.render(renderer);
    }

    const temp = this.textureOld;
    this.textureOld = this.textureComp;
    this.textureComp = temp;
  }

  override setSize(width: number, height: number): void {
    this.textureComp.setSize(width, height);
    this.textureOld.setSize(width, height);
  }
}
