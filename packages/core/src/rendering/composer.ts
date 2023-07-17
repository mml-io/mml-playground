import {
  EffectComposer,
  RenderPass,
  EffectPass,
  FXAAEffect,
  ShaderPass,
  BloomEffect,
} from "postprocessing";
import {
  ACESFilmicToneMapping,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  Vector2,
  WebGLRenderer,
} from "three";

import { GaussGrainEffect } from "./post-effects/gauss-grain";

export class Composer {
  private width: number = window.innerWidth;
  private height: number = window.innerHeight;
  public resolution: Vector2 = new Vector2(this.width, this.height);

  private readonly scene: Scene;
  private readonly camera: PerspectiveCamera;
  public readonly renderer: WebGLRenderer;

  private readonly composer: EffectComposer;
  private readonly renderPass: RenderPass;
  private readonly fxaaEffect: FXAAEffect;
  private readonly fxaaPass: EffectPass;
  private readonly bloomEffect: BloomEffect;
  private readonly bloomPass: EffectPass;

  private readonly gaussGrainEffect = GaussGrainEffect;
  private readonly gaussGrainPass: ShaderPass;

  constructor(scene: Scene, camera: PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = new WebGLRenderer({
      powerPreference: "high-performance",
      antialias: false,
      stencil: false,
      depth: false,
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.5;
    document.body.appendChild(this.renderer.domElement);

    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.fxaaEffect = new FXAAEffect();
    this.fxaaPass = new EffectPass(this.camera, this.fxaaEffect);
    this.bloomEffect = new BloomEffect();
    this.bloomPass = new EffectPass(this.camera, this.bloomEffect);
    this.gaussGrainPass = new ShaderPass(this.gaussGrainEffect, "tDiffuse");

    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.fxaaPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.gaussGrainPass);

    window.addEventListener("resize", () => {
      this.updateProjection();
    });
    this.updateProjection();
  }

  private updateProjection(): void {
    this.width = window.innerWidth;
    this.height = innerHeight;
    this.resolution = new Vector2(this.width, this.height);
    if (this.composer) this.composer.setSize(this.width, this.height);
    if (this.fxaaPass) this.fxaaPass.setSize(this.width, this.height);
    if (this.renderPass) this.renderPass.setSize(this.width, this.height);
    this.renderer.setSize(this.width, this.height);
  }

  public render(time: number): void {
    this.composer.render();
    this.gaussGrainEffect.uniforms.resolution.value = this.resolution;
    this.gaussGrainEffect.uniforms.time.value = time;
    this.gaussGrainEffect.uniforms.alpha.value = 1.0;
    this.gaussGrainEffect.uniforms.amount.value = 0.035;
    this.bloomEffect.intensity = 1.0;
  }
}
