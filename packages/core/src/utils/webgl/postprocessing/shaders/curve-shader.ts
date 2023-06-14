import { type ICurveShader } from "../../types";

import vertexShader from "./vertex-shader";

const CurveShader: ICurveShader = {
  shaderID: "CurvePass",
  uniforms: {
    tDiffuse: { value: null },
    amount: { value: 1.0 },
    vigAmount: { value: 1.0 },
    alpha: { value: 0.0 },
  },
  vertexShader,
  fragmentShader: /* glsl */ `#version 300 es
    precision highp float;

    in vec2 vUv;
    out vec4 fragColor;

    uniform sampler2D tDiffuse;
    uniform float amount;
    uniform float vigAmount;
    uniform float alpha;

    vec2 curve(vec2 uv) {
      uv = (uv - 0.5) * 2.0;
      uv *= 1.1;
      uv.x *= 1.0 + pow((abs(uv.y / 5.0)), 2.0);
      uv.y *= 1.0 + pow((abs(uv.x / 4.0)), 2.0);
      uv = (uv / 2.0) + 0.5;
      uv =  uv * 0.92 + 0.04;
      return uv;
    }

    void main(void) {
      vec2 uv = mix(vUv, curve(vUv), amount);
      vec4 tex = texture(tDiffuse, uv);
      float vig = (0.0 + 1.0 * 16.0 * vUv.x * vUv.y * (1.0 - uv.x) * (1.0 - uv.y));
      tex.rgb = mix(tex.rgb, tex.rgb * vec3(pow(abs(vig), 0.5)), vigAmount);
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) tex *= 0.0;
      fragColor = vec4(tex.rgb, alpha);
    }`,
};

export default CurveShader;
