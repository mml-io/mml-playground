import {
  ACESFilmicToneMapping,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  Vector2,
  WebGLRenderer,
} from "three";

import EffectComposer from "../utils/webgl/postprocessing/helpers/effect-composer";
import RenderPass from "../utils/webgl/postprocessing/helpers/render-pass";
import ShaderPass from "../utils/webgl/postprocessing/helpers/shader-pass";
import BCSVHShader from "../utils/webgl/postprocessing/shaders/bcsvh-shader";
import FXAAShader from "../utils/webgl/postprocessing/shaders/fxaa-shader";
import GaussGrainShader from "../utils/webgl/postprocessing/shaders/gauss-grain-shader";
import UnrealBloomPass from "../utils/webgl/postprocessing/unreal-bloom-pass";

export class Composer {
  private width: number = window.innerWidth;
  private height: number = window.innerHeight;
  public resolution: Vector2 = new Vector2(this.width, this.height);

  private scene: Scene;
  private camera: PerspectiveCamera;
  public renderer: WebGLRenderer;

  public composer: EffectComposer;
  private renderPass: RenderPass;
  private bloomPass: UnrealBloomPass;

  private fxaaPass: ShaderPass;
  private bcsvhPass: ShaderPass;
  private grainPass: ShaderPass;

  constructor(scene: Scene, camera: PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.5;
    document.body.appendChild(this.renderer.domElement);

    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.bloomPass = new UnrealBloomPass(this.resolution, 1.5, 0.4, 0.85, 4);
    this.fxaaPass = new ShaderPass(FXAAShader);
    this.bcsvhPass = new ShaderPass(BCSVHShader);
    this.grainPass = new ShaderPass(GaussGrainShader);

    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.fxaaPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.bcsvhPass);
    this.composer.addPass(this.grainPass);

    window.addEventListener("resize", this.updateProjection.bind(this));
    this.render = this.render.bind(this);
  }

  updateProjection(): void {
    const currentWidth = window.innerWidth;
    const currentHeight = window.innerHeight;
    const currentAspect = currentWidth / currentHeight;
    const tanFOV = Math.tan(((Math.PI / 180.0) * this.camera.fov) / 2.0);
    this.camera.aspect = currentAspect;
    this.camera.fov = (360 / Math.PI) * Math.atan(tanFOV * (currentHeight / this.height));
    this.camera.updateProjectionMatrix();
    this.width = currentWidth;
    this.height = currentHeight;
    this.resolution = new Vector2(this.width, this.height);
    if (this.composer) this.composer.setSize(this.width, this.height);
    if (this.bloomPass) this.bloomPass.setSize(this.width, this.height);
    if (this.renderPass) this.renderPass.setSize(this.width, this.height);
    this.renderer.setSize(this.width, this.height);
  }

  render(time: number): void {
    this.fxaaPass.material.uniforms.resolution!.value.x = 1 / this.width;
    this.fxaaPass.material.uniforms.resolution!.value.y = 1 / this.height;

    this.bloomPass.resolution = this.resolution;
    this.bloomPass.strength = 0.1;
    this.bloomPass.radius = 0.3;
    this.bloomPass.threshold = 0.6;

    this.bcsvhPass.uniforms.brightness!.value = 0.04;
    this.bcsvhPass.uniforms.contrast!.value = 1.2;
    this.bcsvhPass.uniforms.saturation!.value = 0.9;
    this.bcsvhPass.uniforms.vibrance!.value = 1.0;
    this.bcsvhPass.uniforms.hue!.value = 0.02;
    this.bcsvhPass.uniforms.amount!.value = 1.0;

    this.grainPass.uniforms.resolution!.value = this.resolution;
    this.grainPass.uniforms.time!.value = time;
    this.grainPass.uniforms.amount!.value = 0.042;
    this.grainPass.uniforms.alpha!.value = 1.0;

    this.composer.render();
  }
}
