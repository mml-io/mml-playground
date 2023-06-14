import type { IUniform, WebGLRenderer } from "three";
import {
  AdditiveBlending,
  Color,
  LinearFilter,
  MeshBasicMaterial,
  RawShaderMaterial,
  RGBAFormat,
  UniformsUtils,
  Vector2,
  Vector3,
  WebGLRenderTarget,
} from "three";

import { type TLooseObject } from "../types";

import FullScreenQuad from "./helpers/full-screen-quad";
import Pass from "./helpers/pass";
import CopyShader from "./shaders/copy-shader";
import getLuminosityHighPassShader from "./shaders/luminosity-high-pass-shader";

type TCopyShaderProps = {
  uniforms: Record<string, IUniform>;
  vertexShader: string;
  fragmentShader: string;
  blending: typeof AdditiveBlending;
  depthTest: boolean;
  depthWrite: boolean;
  transparent: boolean;
};

type TLuminosityHighPassShaderProps = {
  uniforms: Record<string, IUniform>;
  vertexShader: string;
  fragmentShader: string;
  defines: Record<string, string>;
};

class UnrealBloomPass extends Pass {
  strength: number;
  radius: number;
  threshold: number;
  resolution: Vector2;
  clearColor: Color;
  renderTargetsHorizontal: WebGLRenderTarget[];
  renderTargetsVertical: WebGLRenderTarget[];
  nMips: number;
  renderTargetBright: WebGLRenderTarget;
  highPassUniforms: { [key: string]: IUniform };
  compositeMaterial: RawShaderMaterial;
  bloomTintColors: Vector3[];
  copyUniforms: { [key: string]: IUniform };
  materialCopy: RawShaderMaterial;
  oldClearColor: Color;
  oldClearAlpha: number;
  basic: MeshBasicMaterial;
  fsQuad: FullScreenQuad<any>;
  blurDirectionX = new Vector2(1.0, 0.0);
  blurDirectionY = new Vector2(0.0, 1.0);
  materialHighPassFilter: RawShaderMaterial;
  separableBlurMaterials: RawShaderMaterial[];

  constructor(
    resolution: Vector2 = new Vector2(512, 512),
    strength = 1.5,
    radius = 0.4,
    threshold = 0.85,
    nMips = 5,
  ) {
    super();

    this.strength = strength !== undefined ? strength : 1;
    this.radius = radius;
    this.threshold = threshold;
    this.resolution = resolution;
    this.clearColor = new Color(0, 0, 0);
    this.renderTargetsHorizontal = [];
    this.renderTargetsVertical = [];
    this.nMips = nMips;
    let resx = Math.round(this.resolution.x / 2);
    let resy = Math.round(this.resolution.y / 2);

    this.renderTargetBright = new WebGLRenderTarget(resx, resy, {
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      format: RGBAFormat,
    });
    this.renderTargetBright.texture.name = "UnrealBloomPass.bright";
    this.renderTargetBright.texture.generateMipmaps = false;

    for (let i = 0; i < this.nMips; i += 1) {
      const renderTargetHorizonal = new WebGLRenderTarget(resx, resy, {
        minFilter: LinearFilter,
        magFilter: LinearFilter,
        format: RGBAFormat,
      });
      renderTargetHorizonal.texture.name = `UnrealBloomPass.h${i}`;
      renderTargetHorizonal.texture.generateMipmaps = false;
      this.renderTargetsHorizontal.push(renderTargetHorizonal);

      const renderTargetVertical = new WebGLRenderTarget(resx, resy, {
        minFilter: LinearFilter,
        magFilter: LinearFilter,
        format: RGBAFormat,
      });
      renderTargetVertical.texture.name = `UnrealBloomPass.v${i}`;
      renderTargetVertical.texture.generateMipmaps = false;
      this.renderTargetsVertical.push(renderTargetVertical);

      resx = Math.round(resx / 2);
      resy = Math.round(resy / 2);
    }

    const highPassShader = getLuminosityHighPassShader();
    this.highPassUniforms = UniformsUtils.clone(highPassShader.uniforms);
    this.highPassUniforms.luminosityThreshold!.value = threshold;
    this.highPassUniforms.smoothWidth!.value = 0.01;

    const highPassShaderProps: TLuminosityHighPassShaderProps = {
      uniforms: this.highPassUniforms,
      vertexShader: highPassShader.vertexShader,
      fragmentShader: highPassShader.fragmentShader,
      defines: {},
    };

    this.materialHighPassFilter = new RawShaderMaterial(highPassShaderProps);

    this.separableBlurMaterials = [];
    const kernelSizeArray: number[] = [];
    const kernelSizeDefaultArray: number[] = [3, 5, 7, 9, 11, 15, 17, 19, 23, 27, 31, 35, 39, 43];

    for (let i = 0; i < this.nMips; i += 1) {
      kernelSizeArray.push(kernelSizeDefaultArray[i]!);
    }
    resx = Math.round(this.resolution.x / 2);
    resy = Math.round(this.resolution.y / 2);

    for (let i = 0; i < this.nMips; i += 1) {
      this.separableBlurMaterials.push(this.getSeperableBlurMaterial(kernelSizeArray[i]!));
      this.separableBlurMaterials[i]!.uniforms.texSize!.value = new Vector2(resx, resy);
      resx = Math.round(resx / 2);
      resy = Math.round(resy / 2);
    }

    this.compositeMaterial = this.getCompositeMaterial(this.nMips);
    for (let i = 0; i < this.nMips; i += 1) {
      this.compositeMaterial.uniforms[`blurTexture${i + 1}`]!.value =
        this.renderTargetsVertical[i]!.texture;
    }
    this.compositeMaterial.uniforms.bloomStrength!.value = strength;
    this.compositeMaterial.uniforms.bloomRadius!.value = this.radius;
    this.compositeMaterial.needsUpdate = true;

    const bloomFactors: number[] = [];
    let currentBloomFactor = 0.2;
    for (let i = 0; i < this.nMips; i += 1) {
      bloomFactors.unshift(parseFloat(currentBloomFactor.toFixed(1)));
      currentBloomFactor += 0.2;
    }
    this.bloomTintColors = [];
    for (let i = 0; i < this.nMips; i += 1) this.bloomTintColors.push(new Vector3(1, 1, 1));
    this.compositeMaterial.uniforms.bloomFactors!.value = bloomFactors;
    this.compositeMaterial.uniforms.bloomTintColors!.value = this.bloomTintColors;

    this.copyUniforms = UniformsUtils.clone(CopyShader.uniforms);
    this.copyUniforms.opacity!.value = 1.0;

    const materialCopyShaderProps: TCopyShaderProps = {
      uniforms: this.copyUniforms,
      vertexShader: CopyShader.vertexShader,
      fragmentShader: CopyShader.fragmentShader,
      blending: AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      transparent: true,
    };

    this.materialCopy = new RawShaderMaterial(materialCopyShaderProps);

    this.enabled = true;
    this.needsSwap = false;
    this.oldClearColor = new Color();
    this.oldClearAlpha = 1;
    this.basic = new MeshBasicMaterial();
    this.fsQuad = new FullScreenQuad(this.basic);
  }

  dispose() {
    for (let i = 0; i < this.renderTargetsHorizontal.length; i += 1) {
      this.renderTargetsHorizontal[i]!.dispose();
    }
    for (let i = 0; i < this.renderTargetsVertical.length; i += 1) {
      this.renderTargetsVertical[i]!.dispose();
    }
    this.renderTargetBright.dispose();
  }

  override setSize(width: number, height: number) {
    let resx = Math.round(width / 2);
    let resy = Math.round(height / 2);
    this.renderTargetBright.setSize(resx, resy);
    for (let i = 0; i < this.nMips; i += 1) {
      this.renderTargetsHorizontal[i]!.setSize(resx, resy);
      this.renderTargetsVertical[i]!.setSize(resx, resy);
      this.separableBlurMaterials[i]!.uniforms.texSize!.value = new Vector2(resx, resy);
      resx = Math.round(resx / 2);
      resy = Math.round(resy / 2);
    }
  }

  override render(
    renderer: WebGLRenderer,
    _writeBuffer: WebGLRenderTarget,
    readBuffer: WebGLRenderTarget,
    _deltaTime: number,
    maskActive: boolean,
  ) {
    renderer.getClearColor(this.oldClearColor);
    this.oldClearAlpha = renderer.getClearAlpha();
    const oldAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.setClearColor(this.clearColor, 0);

    if (maskActive) {
      renderer.state.buffers.stencil.setTest(false);
    }

    if (this.renderToScreen) {
      this.fsQuad.material = this.basic;
      this.basic.map = readBuffer.texture;
      renderer.setRenderTarget(null);
      renderer.clear();
      this.fsQuad.render(renderer);
    }

    this.highPassUniforms.tDiffuse!.value = readBuffer.texture;
    this.highPassUniforms.luminosityThreshold!.value = this.threshold;
    this.fsQuad.material = this.materialHighPassFilter;
    renderer.setRenderTarget(this.renderTargetBright);
    renderer.clear();
    this.fsQuad.render(renderer);

    let inputRenderTarget = this.renderTargetBright;
    for (let i = 0; i < this.nMips; i += 1) {
      this.fsQuad.material = this.separableBlurMaterials[i]!;
      this.separableBlurMaterials[i]!.uniforms.colorTexture!.value = inputRenderTarget.texture;
      this.separableBlurMaterials[i]!.uniforms.direction!.value = this.blurDirectionX;
      renderer.setRenderTarget(this.renderTargetsHorizontal[i]!);
      renderer.clear();
      this.fsQuad.render(renderer);

      this.separableBlurMaterials[i]!.uniforms.colorTexture!.value =
        this.renderTargetsHorizontal[i]!.texture;
      this.separableBlurMaterials[i]!.uniforms.direction!.value = this.blurDirectionY;
      renderer.setRenderTarget(this.renderTargetsVertical[i]!);
      renderer.clear();
      this.fsQuad.render(renderer);

      inputRenderTarget = this.renderTargetsVertical[i]!;
    }

    this.fsQuad.material = this.compositeMaterial;
    this.compositeMaterial.uniforms.bloomStrength!.value = this.strength;
    this.compositeMaterial.uniforms.bloomRadius!.value = this.radius;
    this.compositeMaterial.uniforms.bloomTintColors!.value = this.bloomTintColors;
    renderer.setRenderTarget(this.renderTargetsHorizontal[0]!);
    renderer.clear();
    this.fsQuad.render(renderer);

    this.fsQuad.material = this.materialCopy;
    this.copyUniforms.tDiffuse!.value = this.renderTargetsHorizontal[0]!.texture;

    if (maskActive) renderer.state.buffers.stencil.setTest(true);

    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
      this.fsQuad.render(renderer);
    } else {
      renderer.setRenderTarget(readBuffer);
      this.fsQuad.render(renderer);
    }

    renderer.setClearColor(this.oldClearColor, this.oldClearAlpha);
    renderer.autoClear = oldAutoClear;
  }

  getSeperableBlurMaterial(kernelRadius: number) {
    return new RawShaderMaterial({
      uniforms: {
        colorTexture: { value: null },
        texSize: { value: new Vector2(0.5, 0.5) },
        direction: { value: new Vector2(0.5, 0.5) },
      },
      vertexShader: /* glsl */ `#version 300 es
        precision highp float;

        in vec2 uv;
        in vec3 position;
        out vec2 vUv;

        uniform mat4 projectionMatrix;
        uniform mat4 modelViewMatrix;

				void main(void) {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				}`,

      fragmentShader: /* glsl */ `#version 300 es
        precision highp float;
        #include <common>

        #define KERNEL_RADIUS ${kernelRadius}
        #define SIGMA ${kernelRadius}

        in vec2 vUv;
        out vec4 fragColor;

				uniform sampler2D colorTexture;
				uniform vec2 texSize;
				uniform vec2 direction;

				float gaussianPdf(in float x, in float sigma) {
					return 0.39894 * exp(-0.5 * x * x / (sigma * sigma)) / sigma;
				}

				void main(void) {
					vec2 invSize = 1.0 / texSize;
					float fSigma = float(SIGMA);
					float weightSum = gaussianPdf(0.0, fSigma);
					vec3 diffuseSum = texture(colorTexture, vUv).rgb * weightSum;
					for (int i = 1; i < KERNEL_RADIUS; i ++) {
						float x = float(i);
						float w = gaussianPdf(x, fSigma);
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture(colorTexture, vUv + uvOffset).rgb;
						vec3 sample2 = texture(colorTexture, vUv - uvOffset).rgb;
						diffuseSum += (sample1 + sample2) * w;
						weightSum += 2.0 * w;
					}
					fragColor = vec4(diffuseSum / weightSum, 1.0);
				}`,
    });
  }

  getCompositeMaterial(nMips: number) {
    const blurTextures: TLooseObject = {};
    for (let i = 0; i < nMips; i += 1) {
      blurTextures[`blurTexture${i + 1}`] = { value: null };
    }
    let blurTexturesUniforms = "";
    for (let i = 0; i < nMips; i += 1) {
      blurTexturesUniforms = `${blurTexturesUniforms}uniform sampler2D blurTexture${i + 1};\n`;
    }
    let lerpBloomFactorSum = "";
    for (let i = 0; i < nMips; i += 1) {
      lerpBloomFactorSum = `
      ${lerpBloomFactorSum}lerpBloomFactor(bloomFactors[${i}]) * vec4(bloomTintColors[${i}], 1.0) *
      texture(blurTexture${i + 1}, vUv)`;
      if (i !== nMips - 1) {
        lerpBloomFactorSum = `${lerpBloomFactorSum} + \n`;
      }
    }
    return new RawShaderMaterial({
      uniforms: {
        ...blurTextures,
        bloomStrength: { value: 1.0 },
        bloomFactors: { value: null },
        bloomTintColors: { value: null },
        bloomRadius: { value: 0.0 },
      },
      vertexShader: /* glsl */ `#version 300 es
        precision highp float;

        in vec2 uv;
        in vec3 position;
        out vec2 vUv;

        uniform mat4 projectionMatrix;
        uniform mat4 modelViewMatrix;

				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,
      fragmentShader: /* glsl */ `#version 300 es
        precision highp float;

        #define NUM_MIPS ${nMips}

        in vec2 vUv;
        out vec4 fragColor;

				${blurTexturesUniforms}

				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor(const in float factor) {
					float mirrorFactor = 1.2 - factor;
					return mix(factor, mirrorFactor, bloomRadius);
				}

				void main() {
					fragColor = (
            bloomStrength * (
              ${lerpBloomFactorSum}
            )
          );
				}`,
    });
  }
}

export default UnrealBloomPass;
