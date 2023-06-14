import { Vector2 } from "three";

import { type ICRTShader } from "../../types";

import vertexShader from "./vertex-shader";

const CRTShader: ICRTShader = {
  shaderID: "CRTPass",
  uniforms: {
    tDiffuse: { value: null },
    emulatedResolution: { value: new Vector2(640.0, 320.0) },
    warpAmount: { value: new Vector2(7.0, 5.0) },
    warpMix: { value: 0.5 },
    hardScanlinesValue: { value: -16.0 },
    hardPixelsValue: { value: -8.0 },
    maskDark: { value: 0.21 },
    maskLight: { value: 3.0 },
    vignetteAmount: { value: 0.7 },
    amount: { value: 1.0 },
  },
  vertexShader,
  fragmentShader: /* glsl */ `#version 300 es
    precision highp float;
    in vec2 vUv;
    out vec4 fragColor;
    uniform sampler2D tDiffuse;
    uniform vec2 emulatedResolution;
    uniform vec2 warpAmount;
    uniform float warpMix;
    uniform float hardScanlinesValue;
    uniform float hardPixelsValue;
    uniform float maskDark;
    uniform float maskLight;
    uniform float vignetteAmount;
    uniform float amount;

    float toLinear(float c) {
      return (c <= 0.04045) ? c / 12.92 : pow(abs((c + 0.055) / 1.055), 2.4);
    }

    vec3 toLinear(vec3 c) {
      return vec3(toLinear(c.r), toLinear(c.g), toLinear(c.b));
    }

    float toSRGB(float c) {
      return(c < 0.0031308 ? c * 12.92 : 1.055 * pow(abs(c), 0.41666) - 0.055);
    }

    vec3 toSRGB(vec3 c) {
      return vec3(toSRGB(c.r), toSRGB(c.g), toSRGB(c.b));
    }

    vec3 fetch(vec2 pos, vec2 off, vec2 res) {
      pos = floor(pos * res + off) / res;
      if (max(abs(pos.x - 0.5), abs(pos.y - 0.5)) > 0.5) {
        return vec3(0.0);
      }
      return toLinear(texture(tDiffuse, pos.xy, -16.0).xyz);
    }

    vec2 dist(vec2 pos, vec2 res) {
      pos = pos * res;
      return -((pos - floor(pos)) - vec2(0.5));
    }

    float gauss(float pos, float scale) {
      return exp2(scale * pos * pos);
    }

    vec3 horz3(vec2 pos, float off, vec2 res) {
      vec3 b = fetch(pos, vec2(-1.0, off), res);
      vec3 c = fetch(pos, vec2(+0.0, off), res);
      vec3 d = fetch(pos, vec2(+1.0, off), res);
      float dst = dist(pos, res).x;
      float scale = hardPixelsValue;
      float wb = gauss(dst - 1.0, scale);
      float wc = gauss(dst + 0.0, scale);
      float wd = gauss(dst + 1.0, scale);
      return (b * wb + c * wc + d * wd) / (wb + wc + wd);
    }

    vec3 horz5(vec2 pos, float off, vec2 res) {
      vec3 a = fetch(pos, vec2(-2.0, off), res);
      vec3 b = fetch(pos, vec2(-1.0, off), res);
      vec3 c = fetch(pos, vec2(+0.0, off), res);
      vec3 d = fetch(pos, vec2(+1.0, off), res);
      vec3 e = fetch(pos, vec2(+2.0, off), res);
      float dst = dist(pos, res).x;
      float scale = hardPixelsValue;
      float wa = gauss(dst - 2.0, scale);
      float wb = gauss(dst - 1.0, scale);
      float wc = gauss(dst + 0.0, scale);
      float wd = gauss(dst + 1.0, scale);
      float we = gauss(dst + 2.0, scale);
      return (a * wa + b * wb + c * wc + d * wd + e * we) / (wa + wb + wc + wd + we);
    }

    float scan(vec2 pos, float off, vec2 res) {
      float dst = dist(pos, res).y;
      return gauss(dst + off, hardScanlinesValue);
    }

    vec3 tri(vec2 pos, vec2 res) {
      vec3 a = horz3(pos, -1.0, res);
      vec3 b = horz5(pos, +0.0, res);
      vec3 c = horz3(pos, +1.0, res);
      float wa = scan(pos, -1.0, res);
      float wb = scan(pos, +0.0, res);
      float wc = scan(pos, +1.0, res);
      return a * wa + b * wb + c * wc;
    }

    vec3 mask(vec2 pos) {
      pos.x += pos.y * 3.0;
      vec3 m = vec3(maskDark, maskDark, maskDark);
      pos.x = fract(pos.x / 6.0);
      if (pos.x < 0.333334) {
        m.r = maskLight;
      } else if (pos.x < 0.666667) {
        m.g = maskLight;
      } else {
        m.b = maskLight;
      }
      return m;
    }

    float bar(float pos, float bar) {
      pos -= bar;
      return pos * pos < 4.0 ? 0.0 : 1.0;
    }

    vec2 warp(vec2 uv, vec2 warpAmount) {
      uv = uv * 2.0 - 1.0;
      vec2 offset = abs(uv.yx) / vec2(warpAmount.x, warpAmount.y);
      uv = uv + uv * offset * offset;
      uv = uv * 0.5 + 0.5;
      return uv;
    }

    void drawVig(inout vec3 color, vec2 uv, float vigAmount) {
      float vignette = uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y);
      vignette = clamp(pow(abs(16.0 * vignette), 0.1), 0.0, 1.0);
      if (vigAmount > 0.0) {
        color = mix(color, color * vignette, vigAmount);
      }
    }

    void main(void) {
      vec2 uv = vUv;
      vec2 cuv = warp(uv, warpAmount);
      vec2 pos = mix(uv, cuv, warpMix);
      vec4 texel = texture(tDiffuse, pos);
      vec4 color = vec4(tri(pos, emulatedResolution) * mask(gl_FragCoord.xy), 1.0);
      color.xyz = toSRGB(color.xyz * 2.0);
      drawVig(color.xyz, pos, vignetteAmount);
      if (pos.x < 0.0 || pos.x > 1.0 || pos.y < 0.0 || pos.y > 1.0) {
        color *= 0.0;
        texel *= 0.0;
      }
      fragColor = clamp(mix(texel, color, amount), 0.0, 1.0);
    }`,
};

export default CRTShader;
