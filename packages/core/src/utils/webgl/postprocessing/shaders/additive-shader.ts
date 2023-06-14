import { type IAddShader } from "../../types";

import vertexShader from "./vertex-shader";

const AdditiveShader: IAddShader = {
  shaderID: "AdditivePass",
  uniforms: {
    tBase: { value: null },
    tAdd: { value: null },
    fCoeff: { value: 1.0 },
  },
  vertexShader,
  fragmentShader: /* glsl */ `#version 300 es
    precision highp float;

    in vec2 vUv;
    out vec4 fragColor;

    uniform sampler2D tBase;
    uniform sampler2D tAdd;
    uniform float fCoeff;

    void main(void) {
      vec4 texel = texture(tBase, vUv);
      vec4 add = texture(tAdd, vUv);
      fragColor = texel + add * fCoeff;
    }`,
};

export default AdditiveShader;
