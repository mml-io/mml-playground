import { Vector2 } from "three";

import { type IBadCRTShader } from "../../types";

import vertexShader from "./vertex-shader";

const BadCRTShader: IBadCRTShader = {
  shaderID: "BadCRTPass",
  uniforms: {
    tDiffuse: { value: null },
    noiseTexture: { value: null },
    resolution: { value: new Vector2() },
    curveAmount: { value: 0.0 },
    scanLinesAmount: { value: 0.0 },
    time: { value: 0.0 },
    horizontalGlitch: { value: 0.001 },
    verticalGlitch: { value: 0.01 },
    extraGrain: { value: 0.03 },
    shiftBias: { value: 1.0 },
    rgbShiftSpeed: { value: 0.01 },
    rgbShiftAmplitude: { value: 0.01 },
    amount: { value: 1.0 },
    alpha: { value: 0.0 },
  },
  vertexShader,
  fragmentShader: /* glsl */ `#version 300 es
  precision highp float;
  uniform sampler2D tDiffuse;
  uniform sampler2D noiseTexture;
  uniform vec2 resolution;
  uniform float time;
  uniform float curveAmount;
  uniform float scanLinesAmount;

  uniform float horizontalGlitch;
  uniform float verticalGlitch;
  uniform float extraGrain;
  uniform float shiftBias;
  uniform float rgbShiftSpeed;
  uniform float rgbShiftAmplitude;

  uniform float amount;
  uniform float alpha;

  in vec2 vUv;
  out vec4 fragColor;

  const float PI = acos(-1.0);
  const float TAU = PI * 2.0;
  const float SQRTAU = sqrt(TAU);

  float stepm(float a, float b, float c) {
    return step(c, sin(time + a * cos(time * b)));
  }

  float gaussian(float z, float u, float o) {
    return (1.0 / (o * SQRTAU)) * exp(-(((z - u) * (z - u)) / (2.0 * (o * o))));
  }

  vec3 grainColor(float t) {
    vec2 ps = vec2(1.011) / resolution.xy;
    vec2 uv = gl_FragCoord.xy * ps;
    float seed = dot(uv, vec2(12.9898, 78.233));
    float noise = fract(sin(seed) * 43758.5453 + t);
    noise = gaussian(noise, 0.0, 0.5);
    return vec3(noise);
  }

  vec3 rgbShift(vec2 p , vec4 shift, sampler2D tex) {
    shift *= 2.0 * shift.w - 1.0;
    vec2 rs = vec2(shift.x, -shift.y);
    vec2 gs = vec2(shift.y, -shift.z);
    vec2 bs = vec2(shift.z, -shift.x);
    float r = texture(tex, p + rs, 0.0).x;
    float g = texture(tex, p + gs, 0.0).y;
    float b = texture(tex, p + bs, 0.0).z;
    return vec3(r, g, b);
  }

  vec3 badVHS(vec2 uv, sampler2D tex) {
    float tmod = mod(time * 0.25, 3.0);
    float lookyMod = uv.y - tmod;
    float window = 1.0 / (1.0 + 20.0 * lookyMod * lookyMod);
    float lookyStep = stepm(4.0, 4.0, 0.3);
    uv.x = uv.x + sin(uv.y * 10.0 + time) / 100.0 * lookyStep * (1.0 + cos(time * 80.0)) * window * 0.25;
    float vShift = (
      verticalGlitch *
      stepm(2.0, 3.0, 0.9) *
      (
        sin(time) *
        sin(time * 20.0) + (0.5 + 0.1 * sin(time * 200.0) *
        cos(time))
      )
    );
    uv.y = mod(uv.y + vShift, 5.0);
    vec3 desatColor;
    float _r, _g, _b;
    float x = (
      horizontalGlitch *
      sin(0.3 * time + uv.y * 21.0) *
      sin(0.7 * time + uv.y * 29.0) *
      sin(0.3 + 0.33 * time + uv.y * 31.0)
    );
    _r = texture(tex, vec2(x + uv.x + 0.001, uv.y + 0.001)).x + 0.007;
    _g = texture(tex, vec2(x + uv.x + 0.000, uv.y - 0.002)).y + 0.007;
    _b = texture(tex, vec2(x + uv.x - 0.002, uv.y + 0.000)).z + 0.007;
    _r += 0.08 * texture(tex, 0.75 * vec2(x +  0.012, -0.013) + vec2(uv.x + 0.001, uv.y + 0.001)).x;
    _g += 0.05 * texture(tex, 0.75 * vec2(x + -0.011, -0.010) + vec2(uv.x + 0.000, uv.y - 0.002)).y;
    _b += 0.08 * texture(tex, 0.75 * vec2(x + -0.010, -0.009) + vec2(uv.x - 0.002, uv.y + 0.000)).z;
    float _luma = 0.3 * _r + 0.6 * _g + 0.1 * _b;
    float _desat = 0.3;
    desatColor = vec3(
      _r + _desat * (_luma - _r),
      _g + _desat * (_luma - _g),
      _b + _desat * (_luma - _b)
    );
    desatColor = clamp(desatColor, 0.0, 1.0);
    return desatColor;
  }

  vec4 staticNoise(vec2 uv) {
    return texture(noiseTexture, uv, 0.0);
  }

  vec4 vec4pow(vec4 v, float p) {
    return vec4(
      pow(v.x, p),
      pow(v.y, p),
      pow(v.z, p),
      v.w
    );
  }

  float oscillate(float s, float e, float t) {
    return (e - s) * 0.5 + s + sin(t) * (e - s) * 0.5;
  }

  vec2 curve(in vec2 uv) {
    uv = (uv - 0.5) * 2.0;
    uv *= 1.1;
    uv.x *= 1.0 + pow((abs(uv.y / 5.0)), 2.0);
    uv.y *= 1.0 + pow((abs(uv.x / 4.0)), 2.0);
    uv  = (uv / 2.0) + 0.5;
    uv =  uv *0.92 + 0.04;
    return uv;
  }

  vec2 curve(in vec2 uv, in float r) {
    uv = (uv - 0.5) * 2.0;
    uv = r * uv / sqrt(r * r - dot(uv, uv));
    uv = (uv * 0.5) + 0.5;
    return uv;
  }

  void main(void) {
    const float cuv = 0.5;
    vec2 uv = vUv;
    float curveUV = (20.0 - curveAmount * 10.0) + 0.00001;
    if (curveAmount > 0.0) {
      uv = mix(curve(uv), curve(uv, curveUV), 0.7);
    }
    vec4 oColor = texture(tDiffuse, uv);
    vec3 color = badVHS(uv, tDiffuse);
    vec4 shift = vec4pow(
      staticNoise(
        vec2(rgbShiftSpeed * time, rgbShiftSpeed * time / 25.0 )
      ), 8.0
    ) * vec4(vec3(rgbShiftAmplitude), 1.0);
    color = mix(color, rgbShift(uv, shift, tDiffuse), length(shift) * shiftBias);
    float frameScale = 29.97;
    float frameTime = floor(time * frameScale) / frameScale;
    vec3 grain = grainColor(frameTime) * extraGrain;
    float scans = clamp(0.35 + 0.35 * sin(3.5 * time + uv.y * resolution.y * 1.5), 0.0, 1.0);
    float s = pow(abs(scans), 2.33);
    vec3 slColor = color * vec3(1.4 + 1.7 * s) * 1.3;
    color = mix(color, slColor, scanLinesAmount);
    color += grain;
    color = mix(color * color, color, oscillate(0.1, 0.5, time * 0.5));
    float vig = (0.0 + 1.0 * 16.0 * uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y));
    color *= vec3(pow(abs(vig), 0.21));
    color.rgb = mix(oColor.rgb, color.rgb, amount);
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { color *= 0.0; }
    fragColor = vec4(color, alpha);
  }
  `,
};

export default BadCRTShader;
