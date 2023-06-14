import { Vector2 } from "three";

import { type IGaussGrainShader } from "../../types";

import vertexShader from "./vertex-shader";

const GaussGrainShader: IGaussGrainShader = {
  shaderID: "GaussGrainPass",
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new Vector2() },
    time: { value: 0 },
    amount: { value: 0.04 },
    alpha: { value: 0.0 },
  },
  vertexShader,
  fragmentShader: /* glsl */ `#version 300 es
    precision highp float;
    in vec2 vUv;
    out vec4 fragColor;
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float time;
    uniform float amount;
    uniform float alpha;

    const float PI = acos(-1.0);
    const float TAU = PI * 2.0;
    const float SQRTAU = sqrt(TAU);

    float gaussian(float z, float u, float o) {
      return (
        (1.0 / (o * SQRTAU)) *
        (exp(-(((z - u) * (z - u)) / (2.0 * (o * o)))))
      );
    }

    vec3 gaussgrain() {
      vec2 ps = vec2(1.01) / resolution.xy;
      vec2 uv = gl_FragCoord.xy * ps;
      float t = time;
      float seed = dot(uv, vec2(12.9898, 78.233));
      float noise = fract(sin(seed) * 43758.5453123 + t);
      noise = gaussian(noise, 0.0, 0.5);
      return vec3(noise);
    }

    void main(void) {
      vec2 uv = vUv;
      vec4 originalColor = texture(tDiffuse, uv);
      vec3 grain = gaussgrain();
      vec3 col = originalColor.rgb + (grain * amount);
      fragColor = vec4(clamp(col, 0.0, 1.0), alpha);
    }`,
};

export default GaussGrainShader;
