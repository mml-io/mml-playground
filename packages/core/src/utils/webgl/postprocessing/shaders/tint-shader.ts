import { Vector3 } from "three";

import { type ITintShader } from "../../types";

import vertexShader from "./vertex-shader";

const TintShader: ITintShader = {
  shaderID: "TintPass",
  uniforms: {
    tDiffuse: { value: null },
    tint: { value: new Vector3(1.0, 1.0, 1.0) },
    amount: { value: 1.0 },
    alpha: { value: 0.0 },
  },
  vertexShader,
  fragmentShader: /* glsl */ `#version 300 es
    precision highp float;

    in vec2 vUv;
    out vec4 fragColor;

    uniform sampler2D tDiffuse;
    uniform vec3 tint;
    uniform float amount;
    uniform float alpha;

    void main(void) {
      vec4 texel = texture(tDiffuse, vUv);
      float gray = dot(texel.rgb, vec3(0.299, 0.587, 0.114)) * 1.1;
      vec3 color = mix(texel.rgb, gray * tint, amount);
      fragColor = vec4(color, texel.w * alpha);
    }
    `,
};

export default TintShader;
