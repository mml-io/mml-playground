import type { Camera, Scene, WebGLRenderer } from "three";
import { ClampToEdgeWrapping, FloatType, LinearFilter, RGBAFormat, WebGLRenderTarget } from "three";

import type { TTargetParameters } from "../types";

class TargetManager {
  name: string;
  renderer: WebGLRenderer;
  width: number;
  height: number;
  targetParameters: TTargetParameters;
  readBuffer: WebGLRenderTarget;
  writeBuffer: WebGLRenderTarget;

  constructor(renderer: WebGLRenderer, width: number, height: number, name: string) {
    this.name = name;
    this.renderer = renderer;
    this.renderer.autoClear = true;
    this.width = width;
    this.height = height;

    this.targetParameters = {
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      format: RGBAFormat,
      type: FloatType,
      stencilBuffer: false,
    };

    this.readBuffer = new WebGLRenderTarget(this.width, this.height, this.targetParameters);
    this.writeBuffer = this.readBuffer.clone();

    this.readBuffer.texture.wrapS = ClampToEdgeWrapping;
    this.readBuffer.texture.wrapT = ClampToEdgeWrapping;
    this.writeBuffer.texture.wrapS = ClampToEdgeWrapping;
    this.writeBuffer.texture.wrapT = ClampToEdgeWrapping;

    this.swap = this.swap.bind(this);
    this.resize = this.resize.bind(this);
    this.render = this.render.bind(this);
    this.dispose = this.dispose.bind(this);
  }

  swap() {
    const temp = this.readBuffer;
    this.readBuffer = this.writeBuffer;
    this.writeBuffer = temp;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.readBuffer.setSize(width, height);
    this.writeBuffer.setSize(width, height);
  }

  render(scene: Scene, camera: Camera, toScreen: boolean = false): void {
    if (this.readBuffer && this.writeBuffer) {
      if (toScreen) {
        this.renderer.setRenderTarget(null);
        this.renderer.render(scene, camera);
      } else {
        this.renderer.setRenderTarget(this.writeBuffer);
        this.renderer.render(scene, camera);
      }
      this.swap();
    }
  }

  dispose(): void {
    if (this.readBuffer) {
      this.readBuffer.dispose();
    }
    if (this.writeBuffer) {
      this.writeBuffer.dispose();
    }
  }
}

export default TargetManager;
