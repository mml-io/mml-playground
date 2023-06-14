import type { Shader, WebGLRenderer, WebGLRenderTarget } from "three";
import { RawShaderMaterial, ShaderMaterial, UniformsUtils } from "three";

import { type IMaterial, type TShaderPassShader } from "../../types";

import FullScreenQuad from "./full-screen-quad";
import Pass from "./pass";

class ShaderPass extends Pass {
  textureID?: string;

  uniforms: Shader["uniforms"];

  material: IMaterial;

  fsQuad: FullScreenQuad<any>;

  constructor(shader: TShaderPassShader, textureID = "tDiffuse") {
    super();

    this.textureID = textureID;

    if (shader instanceof ShaderMaterial) {
      this.uniforms = shader.uniforms;
      this.material = shader;
    } else {
      this.uniforms = UniformsUtils.clone(shader.uniforms);
      const materialProperties = {
        defines: { ...shader.defines },
        uniforms: this.uniforms,
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader,
      };
      this.material = new RawShaderMaterial(materialProperties);
    }
    this.fsQuad = new FullScreenQuad(this.material);
  }

  override render(
    renderer: WebGLRenderer,
    writeBuffer: WebGLRenderTarget,
    readBuffer: WebGLRenderTarget,
    _deltaTime: number,
    _maskActive?: boolean,
  ): void {
    if (this.uniforms[this.textureID!]) {
      this.uniforms[this.textureID!]!.value = readBuffer.texture;
    }

    this.fsQuad.material = this.material;

    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
      this.fsQuad.render(renderer);
    } else {
      renderer.setRenderTarget(writeBuffer);
      if (this.clear) {
        renderer.clear(renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil);
      }
      this.fsQuad.render(renderer);
    }
  }
}

export default ShaderPass;
