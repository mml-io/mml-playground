import { Color, MeshPhysicalMaterial, UniformsUtils } from "three";

import { bayerDither } from "../rendering/shaders/bayer-dither";
import {
  injectBefore,
  injectBeforeMain,
  injectInsideMain,
} from "../rendering/shaders/shader-helpers";

type TUniform<TValue = any> = { value: TValue };

export class CharacterMaterial extends MeshPhysicalMaterial {
  public uniforms: Record<string, TUniform> = {};
  public colorsCube216: Color[] = [];

  constructor() {
    super();
    this.color = new Color(0xffffff);
    this.transmission = 0.5;
    this.metalness = 0.5;
    this.roughness = 0.3;
    this.ior = 2.0;
    this.thickness = 0.1;
    this.specularColor = new Color(0x0077ff);
    this.specularIntensity = 0.1;
    this.envMapIntensity = 1.8;
    this.sheenColor = new Color(0x770077);
    this.sheen = 0.35;

    this.onBeforeCompile = (shader) => {
      this.uniforms = UniformsUtils.clone(shader.uniforms);
      this.uniforms.nearClip = { value: 0.01 };
      this.uniforms.farClip = { value: 1000.0 };
      this.uniforms.ditheringNear = { value: 0.25 };
      this.uniforms.ditheringRange = { value: 0.5 };
      this.uniforms.time = { value: 0.0 };
      this.uniforms.diffuseRandomColor = { value: new Color() };
      shader.uniforms = this.uniforms;

      shader.vertexShader = injectBeforeMain(shader.vertexShader, "varying vec2 vUv;");
      shader.vertexShader = injectInsideMain(shader.vertexShader, "vUv = uv;");

      shader.fragmentShader = injectBeforeMain(
        shader.fragmentShader,
        /* glsl */ `
          varying vec2 vUv;
          uniform float nearClip;
          uniform float farClip;
          uniform float ditheringNear;
          uniform float ditheringRange;
          uniform float time;
          uniform vec3 diffuseRandomColor;
          ${bayerDither}
        `,
      );

      shader.fragmentShader = injectBefore(
        shader.fragmentShader,
        "#include <output_fragment>",
        /* glsl */ `
          float distance = length(vWorldPosition - cameraPosition);
          float normalizedDistance = (distance - nearClip) / (farClip - nearClip);
          ivec2 p = ivec2(mod(gl_FragCoord.xy, 8.0));
          float d = 0.0;
          if (p.x <= 3 && p.y <= 3) {
            d = bayerDither(bayertl, p);
          } else if (p.x > 3 && p.y <= 3) {
            d = bayerDither(bayertr, p - ivec2(4, 0));
          } else if (p.x <= 3 && p.y > 3) {
            d = bayerDither(bayerbl, p - ivec2(0, 4));
          } else if (p.x > 3 && p.y > 3) {
            d = bayerDither(bayerbr, p - ivec2(4, 4));
          }
          if (distance <= ditheringNear + d * ditheringRange) discard;
          vec2 suv = vUv;
          float s = clamp(0.35 + 0.35 * sin(5.0 * -time + suv.y * 500.0), 0.0, 1.0);
          float scanLines = pow(s, 1.33);
          outgoingLight *= diffuseRandomColor;
          outgoingLight += smoothstep(0.1, 0.0, scanLines) * 0.1;
        `,
      );
    };

    this.generateColorCube();
  }

  private generateColorCube() {
    const saturation = 0.7;
    const lightness = 0.8;
    const goldenRatioConjugate = 0.618033988749895;
    let hue = 0;

    for (let i = 0; i < 216; i++) {
      const color = new Color();
      color.setHSL(hue, saturation, lightness);
      this.colorsCube216.push(color);
      hue = (hue + goldenRatioConjugate) % 1;
    }
  }
}
