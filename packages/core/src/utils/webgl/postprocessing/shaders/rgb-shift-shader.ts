import { type IRGBShiftShader } from "../../types";

import vertexShader from "./vertex-shader";

const RGBShiftShader: IRGBShiftShader = {
  shaderID: "RGBShiftPass",
  uniforms: {
    tDiffuse: { value: null },
    amount: { value: 0.05 },
    angle: { value: 0 },
    alpha: { value: 0.0 },
  },
  vertexShader,
  fragmentShader: /* glsl */ `#version 300 es
    precision highp float;
    in vec2 vUv;
    out vec4 fragColor;
    uniform sampler2D tDiffuse;
    uniform float amount;
    uniform float angle;
    uniform float alpha;

    void main(void) {
      vec2 uv = vUv;
      vec2 offset = (amount * 0.05) * vec2(cos(angle), sin(angle));
      vec4 cr = texture(tDiffuse, uv + offset);
      vec4 cb = texture(tDiffuse, uv - offset);
      vec4 cga = texture(tDiffuse, uv);
      fragColor = vec4(cr.r, cga.g, cb.b, cga.a * alpha);
    }`,
};

export default RGBShiftShader;
