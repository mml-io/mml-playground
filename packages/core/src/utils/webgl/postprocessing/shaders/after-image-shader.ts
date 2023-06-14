import { type IAfterImageShader } from "../../types";

import vertexShader from "./vertex-shader";

const AfterimageShader: IAfterImageShader = {
  shaderID: "AfterImagePass",
  uniforms: {
    damp: { value: 0.96 },
    tOld: { value: null },
    tNew: { value: null },
  },
  vertexShader,
  fragmentShader: /* glsl */ `#version 300 es
  precision highp float;
  uniform float damp;
  uniform sampler2D tOld;
  uniform sampler2D tNew;

  in vec2 vUv;
  out vec4 fragColor;

  vec4 whenGt(vec4 x, float y) {
    return max(sign(x - y), 0.0);
  }
  void main(void) {
    vec4 texelOld = texture(tOld, vUv);
    vec4 texelNew = texture(tNew, vUv);
    texelOld *= damp * whenGt(texelOld, 0.1);
    fragColor = max(texelNew, texelOld);
  }
  `,
};

export default AfterimageShader;
