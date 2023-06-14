import { type ICopyShader } from "../../types";

import vertexShader from "./vertex-shader";

const CopyShader: ICopyShader = {
  shaderID: "CopyPass",
  uniforms: {
    tDiffuse: { value: null },
    opacity: { value: 1.0 },
  },
  vertexShader,
  fragmentShader: /* glsl */ `#version 300 es
    precision highp float;
    in vec2 vUv;
    out vec4 fragColor;
    uniform float opacity;
    uniform sampler2D tDiffuse;
    void main(void) {
      vec4 texel = texture(tDiffuse, vUv);
      fragColor = opacity * texel;
    }`,
};

export default CopyShader;
