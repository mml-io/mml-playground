import {
  Clock,
  LinearFilter,
  RGBAFormat,
  Vector2,
  type WebGLRenderer,
  WebGLRenderTarget,
} from "three";

import CopyShader from "../shaders/copy-shader";

import ClearMaskPass from "./clear-mask-pass";
import MaskPass from "./mask-pass";
import type Pass from "./pass";
import ShaderPass from "./shader-pass";

export default class EffectComposer {
  renderer: WebGLRenderer;
  pixelRatio: number;
  width: number;
  height: number;
  renderTarget1: WebGLRenderTarget;
  renderTarget2: WebGLRenderTarget;
  writeBuffer: WebGLRenderTarget;
  readBuffer: WebGLRenderTarget;
  renderToScreen: boolean;
  passes: Pass[];
  copyPass: ShaderPass;
  clock: Clock;

  constructor(renderer: WebGLRenderer, renderTarget?: WebGLRenderTarget) {
    this.renderer = renderer;

    if (renderTarget === undefined) {
      const parameters = {
        minFilter: LinearFilter,
        magFilter: LinearFilter,
        format: RGBAFormat,
      };
      const size = renderer.getSize(new Vector2());
      this.pixelRatio = renderer.getPixelRatio();
      this.width = size.width;
      this.height = size.height;
      renderTarget = new WebGLRenderTarget(
        this.width * this.pixelRatio,
        this.height * this.pixelRatio,
        parameters,
      );
      renderTarget.texture.name = "EffectComposer.rt1";
    } else {
      this.pixelRatio = 1;
      this.width = renderTarget.width;
      this.height = renderTarget.height;
    }

    this.renderTarget1 = renderTarget;
    this.renderTarget2 = renderTarget.clone();
    this.renderTarget2.texture.name = "EffectComposer.rt2";
    this.writeBuffer = this.renderTarget1;
    this.readBuffer = this.renderTarget2;
    this.renderToScreen = true;
    this.passes = [];

    this.copyPass = new ShaderPass(CopyShader);

    this.clock = new Clock();
  }

  swapBuffers(): void {
    const tmp = this.readBuffer;
    this.readBuffer = this.writeBuffer;
    this.writeBuffer = tmp;
  }

  addPass(pass: Pass): void {
    this.passes.push(pass);
    pass.setSize(this.width * this.pixelRatio, this.height * this.pixelRatio);
  }

  insertPass(pass: Pass, index: number): void {
    this.passes.splice(index, 0, pass);
    pass.setSize(this.width * this.pixelRatio, this.height * this.pixelRatio);
  }

  removePass(pass: Pass): void {
    const index = this.passes.indexOf(pass);
    if (index !== -1) {
      this.passes.splice(index, 1);
    }
  }

  isLastEnabledPass(passIndex: number): boolean {
    for (let i = passIndex + 1; i < this.passes.length; i += 1) {
      if (this.passes[i]!.enabled) {
        return false;
      }
    }
    return true;
  }

  render(deltaTime?: number | undefined): void {
    if (deltaTime === undefined) {
      deltaTime = this.clock.getDelta();
    }

    const currentRenderTarget = this.renderer.getRenderTarget();
    let maskActive = false;

    for (let i = 0, il = this.passes.length; i < il; i += 1) {
      const pass = this.passes[i];
      if (pass!.enabled === false) continue;
      pass!.renderToScreen = this.renderToScreen && this.isLastEnabledPass(i);
      pass!.render(this.renderer, this.writeBuffer, this.readBuffer, deltaTime, maskActive);

      if (pass!.needsSwap) {
        if (maskActive) {
          const context = this.renderer.getContext();
          const { stencil } = this.renderer.state.buffers;
          stencil.setFunc(context.NOTEQUAL, 1, 0xffffffff);
          this.copyPass.render(this.renderer, this.writeBuffer, this.readBuffer, deltaTime);
          stencil.setFunc(context.EQUAL, 1, 0xffffffff);
        }
        this.swapBuffers();
      }

      if (MaskPass !== undefined) {
        if (pass instanceof MaskPass) {
          maskActive = true;
        } else if (pass instanceof ClearMaskPass) {
          maskActive = false;
        }
      }
    }

    this.renderer.setRenderTarget(currentRenderTarget);
  }

  reset(renderTarget: WebGLRenderTarget): void {
    if (renderTarget === undefined) {
      const size = this.renderer.getSize(new Vector2());
      this.pixelRatio = this.renderer.getPixelRatio();
      this.width = size.width;
      this.height = size.height;
      renderTarget = this.renderTarget1.clone();
      renderTarget.setSize(this.width * this.pixelRatio, this.height * this.pixelRatio);
    }

    this.renderTarget1.dispose();
    this.renderTarget2.dispose();
    this.renderTarget1 = renderTarget;
    this.renderTarget2 = renderTarget.clone();
    this.writeBuffer = this.renderTarget1;
    this.readBuffer = this.renderTarget2;
  }

  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    const effectiveWidth = this.width * this.pixelRatio;
    const effectiveHeight = this.height * this.pixelRatio;
    this.renderTarget1.setSize(effectiveWidth, effectiveHeight);
    this.renderTarget2.setSize(effectiveWidth, effectiveHeight);

    for (let i = 0; i < this.passes.length; i += 1) {
      this.passes[i]!.setSize(effectiveWidth, effectiveHeight);
    }
  }

  setPixelRatio(pixelRatio: number): void {
    this.pixelRatio = pixelRatio;
    this.setSize(this.width, this.height);
  }
}
