import { type IDitherShader } from "../../types";

import vertexShader from "./vertex-shader";

const DitherShader: IDitherShader = {
  shaderID: "GaussGrainPass",
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    size: { value: 4.0 },
    amount: { value: 0.25 },
    alpha: { value: 0.0 },
  },
  vertexShader,
  fragmentShader: /* glsl */ `#version 300 es
    precision highp float;
    #define dither(c,u,d) floor(fract(dot(vec2(131,312),u+time)/vec3(103,71,97))*.375-.1875+c*d)/d
    in vec2 vUv;
    out vec4 fragColor;
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float size;
    uniform float amount;
    uniform float alpha;

    void main(void) {
      vec2 uv = vUv;
      vec4 originalColor = texture(tDiffuse, uv);
      vec4 d = vec4(
        dither(originalColor.rgb, gl_FragCoord.xy, size),
        originalColor.a
      );
      vec4 m = mix(originalColor, d, amount);
      m.a *= alpha;
      fragColor = m;
    }`,
};

export default DitherShader;
