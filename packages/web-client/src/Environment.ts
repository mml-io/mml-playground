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

export class Environment extends Group {
  private readonly sky: Sky | null = null;
  private readonly skyParameters = {
    elevation: 45,
    azimuth: 180,
  };
  private readonly sunPosition = new Vector3();
  private readonly pmremGenerator: PMREMGenerator | null = null;
  private readonly skyRenderTarget: WebGLRenderTarget | null = null;

  constructor(scene: Scene, renderer: WebGLRenderer) {
    super();
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
    if (this.skyRenderTarget !== null) {
      this.skyRenderTarget.dispose();
    }
    this.skyRenderTarget = this.pmremGenerator.fromScene(this.sky as unknown as Scene);
    scene.environment = this.skyRenderTarget.texture;
    this.add(this.sky);
  }
}
