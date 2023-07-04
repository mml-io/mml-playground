import {
  Group,
  MathUtils,
  PMREMGenerator,
  Scene,
  Vector3,
  WebGLRenderTarget,
  WebGLRenderer,
} from "three";
import { Sky } from "three/examples/jsm/objects/Sky.js";

export class Environment {
  private sky: Sky | null = null;
  private skyParameters = {
    elevation: 45,
    azimuth: 180,
  };
  private sunPosition = new Vector3();
  private pmremGenerator: PMREMGenerator | null = null;
  private skyRenderTarget: WebGLRenderTarget | null = null;
  private group: Group = new Group();

  constructor(scene: Scene, renderer: WebGLRenderer, onLoadCallback: (group: Group) => void) {
    this.sky = new Sky();
    this.sky.scale.setScalar(10000);
    this.pmremGenerator = new PMREMGenerator(renderer);

    const phi = MathUtils.degToRad(90 - this.skyParameters.elevation);
    const theta = MathUtils.degToRad(this.skyParameters.azimuth);
    this.sunPosition.setFromSphericalCoords(1, phi, theta);

    this.sky.material.uniforms.sunPosition.value.copy(this.sunPosition);
    this.sky.material.uniforms.turbidity.value = 10;
    this.sky.material.uniforms.rayleigh.value = 2;
    this.sky.material.uniforms.mieCoefficient.value = 0.005;
    this.sky.material.uniforms.mieDirectionalG.value = 0.8;
    if (this.skyRenderTarget !== null) this.skyRenderTarget.dispose();
    this.skyRenderTarget = this.pmremGenerator.fromScene(this.sky as unknown as Scene);
    scene.environment = this.skyRenderTarget.texture;
    this.group.add(this.sky);
    onLoadCallback(this.group);
  }
}
