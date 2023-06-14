import { Color } from "three";

import { type ILuminosityShader } from "../../types";

import vertexShader from "./vertex-shader";

const fragmentShader = /* glsl */ `#version 300 es

precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D tDiffuse;
uniform vec3 defaultColor;
uniform float defaultOpacity;
uniform float luminosityThreshold;
uniform float smoothWidth;

void main(void) {
  vec4 texel = texture(tDiffuse, vUv);
  vec3 luma = vec3(0.299, 0.587, 0.114);
  float v = dot(texel.xyz, luma);
  vec4 outputColor = vec4(defaultColor.rgb, defaultOpacity);
  float alpha = smoothstep(luminosityThreshold, luminosityThreshold + smoothWidth, v);
  fragColor = mix(outputColor, texel, alpha);
}`;

const getLuminosityHighPassShader = (): ILuminosityShader => {
  const LuminosityHighPassShader: ILuminosityShader = {
    shaderID: "luminosityHighPass",
    uniforms: {
      tDiffuse: { value: null },
      luminosityThreshold: { value: 1.0 },
      smoothWidth: { value: 1.0 },
      defaultColor: { value: new Color(0x000000) },
      defaultOpacity: { value: 0.0 },
    },
    vertexShader,
    fragmentShader,
  };
  return LuminosityHighPassShader;
};

export default getLuminosityHighPassShader;
