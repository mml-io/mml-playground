import { type IBCSVHShader } from "../../types";

import vertexShader from "./vertex-shader";

const BCSVHShader: IBCSVHShader = {
  shaderID: "BCSVHPass",
  uniforms: {
    tDiffuse: { value: null },
    brightness: { value: 0.0 },
    contrast: { value: 1.0 },
    saturation: { value: 1.0 },
    vibrance: { value: 1.0 },
    hue: { value: 0.0 },
    amount: { value: 1.0 },
    alpha: { value: 0.0 },
  },
  vertexShader,
  fragmentShader: /* glsl */ `#version 300 es
    precision highp float;
    in vec2 vUv;
    out vec4 fragColor;
    uniform sampler2D tDiffuse;
    uniform float brightness;
    uniform float contrast;
    uniform float saturation;
    uniform float vibrance;
    uniform float hue;
    uniform float amount;
    uniform float alpha;

    void brightnessAdjust(inout vec4 color, in float b) {
      color.rgb += b;
    }

    void contrastAdjust(inout vec4 color, in float c) {
      float t = 0.5 - c * 0.5;
      color.rgb = color.rgb * c + t;
    }

    mat4 saturationMatrix(float saturation) {
      vec3 luminance = vec3(0.3086, 0.6094, 0.0820);
      float oneMinusSat = 1.0 - saturation;
      vec3 r = vec3(luminance.x * oneMinusSat);
      r.r += saturation;
      vec3 g = vec3(luminance.y * oneMinusSat);
      g.g += saturation;
      vec3 b = vec3(luminance.z * oneMinusSat);
      b.b += saturation;
      return mat4(
        r.x, r.y, r.z, 0,
        g.x, g.y, g.z, 0,
        b.x, b.y, b.z, 0,
        0,   0,   0,   1
        );
    }

    vec4 shiftHue(in vec3 col, in float Shift) {
      vec3 P = vec3(0.55735) * dot(vec3(0.55735), col);
      vec3 U = col - P;
      vec3 V = cross(vec3(0.55735), U);
      col = U * cos(Shift * 6.283185307179586) + V * sin(Shift * 6.283185307179586) + P;
      return vec4(col, 1.0);
    }

    vec3 RGBtoHSV(in vec3 rgb) {
      vec3 hsv;
      float cmax = max(rgb.r, max(rgb.g, rgb.b));
      float cmin = min(rgb.r, min(rgb.g, rgb.b));
      hsv.z = cmax; // value / lightness
      float chroma = cmax - cmin;
      hsv.y = chroma / cmax; // saturation
      if (rgb.r > rgb.g && rgb.r > rgb.b) {
        hsv.x = (0.0 + (rgb.g - rgb.b) / chroma) / 6.0; // hue
      } else if (rgb.g > rgb.b) {
        hsv.x = (2.0 + (rgb.b - rgb.r) / chroma) / 6.0; // hue
      } else {
        hsv.x = (4.0 + (rgb.r - rgb.g) / chroma) / 6.0; // hue
      }
      hsv.x = fract(hsv.x); // normalize hue
      return hsv;
    }

    vec3 HSVtoRGB(in vec3 hsv) {
      vec3 rgb = clamp(abs(mod(hsv.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
      return hsv.z * mix(vec3(1.0), rgb, hsv.y);
    }

    int modi(in int x, in int y) {
      return x - y * (x / y);
    }

    int and(in int a, in int b) {
      int result = 0;
      int n = 1;
      const int bitCount = 32;
      for (int i = 0; i < bitCount; i++) {
        if ((modi(a, 2) == 1) && (modi(b, 2) == 1)) {
          result += n;
        }
        a >>= 1;
        b >>= 1;
        n <<= 1;
        if (a <= 0) break;
        // if (!(a > 0 && b > 0)) { break; }
      }
      return result;
    }

    vec4 vibranceAdjust(in vec4 inCol, in float vibrance) {
      vec4 outCol;
      if (vibrance <= 1.0) {
        float avg = dot(inCol.rgb, vec3(0.3086, 0.6094, 0.0820));
        outCol.rgb = mix(vec3(avg), inCol.rgb, vibrance);
      } else {
        float hue_a, a, f, p1, p2, p3, i, h, s, v, amt, _max, _min, dlt;
        float br1, br2, br3, br4, br5, br2_or_br1, br3_or_br1, br4_or_br1, br5_or_br1;
        int use;
        _min = min(min(inCol.r, inCol.g), inCol.b);
        _max = max(max(inCol.r, inCol.g), inCol.b);
        dlt = _max - _min + 0.00001; // prevents division by zero
        h = 0.0;
        v = _max;
        br1 = step(_max, 0.0);
        s = (dlt / _max) * (1.0 - br1);
        h = -1.0 * br1;
        br2 = 1.0 - step(_max - inCol.r, 0.0);
        br2_or_br1 = max(br2, br1);
        h = ((inCol.g - inCol.b) / dlt) * (1.0 - br2_or_br1) + (h * br2_or_br1);
        br3 = 1.0 - step(_max - inCol.g, 0.0);
        br3_or_br1 = max(br3, br1);
        h = (2.0 + (inCol.b - inCol.r) / dlt) * (1.0 - br3_or_br1) + (h * br3_or_br1);
        br4 = 1.0 - br2 * br3;
        br4_or_br1 = max(br4, br1);
        h = (4.0 + (inCol.r - inCol.g) / dlt) * (1.0 - br4_or_br1) + (h * br4_or_br1);
        h = h * (1.0 - br1);
        hue_a = abs(h);
        a = dlt;
        a = step(1.0, hue_a) * a * (hue_a * 0.666667 + 0.333334) + step(hue_a, 1.0) * a;
        a *= (vibrance - 1.0);
        s = (1.0 - a) * s + a * pow(s, 0.25);
        i = floor(h);
        f = h - i;
        p1 = v * (1.0 - s);
        p2 = v * (1.0 - (s * f));
        p3 = v * (1.0 - (s * (1.0 - f)));
        inCol.rgb = vec3(0.0);
        i += 6.0;
        use = int(pow(abs(2.0), mod(i, 6.0)));
        a = float(and(use, 1));
        use >>= 1;
        inCol.rgb += a * vec3(v, p3, p1);
        a = float(and(use , 1));
        use >>= 1;
        inCol.rgb += a * vec3(p2, v, p1);
        a = float(and(use, 1));
        use >>= 1;
        inCol.rgb += a * vec3(p1, v, p3);
        a = float(and(use, 1));
        use >>= 1;
        inCol.rgb += a * vec3(p1, p2, v);
        a = float(and(use, 1));
        use >>= 1;
        inCol.rgb += a * vec3(p3, p1, v);
        a = float(and(use, 1));
        use >>= 1;
        inCol.rgb += a * vec3(v, p1, p2);
        outCol = inCol;
      }
      return outCol;
    }

    void main(void) {
      vec2 uv = vUv;
      vec4 originalColor = texture(tDiffuse, uv);
      vec4 bcColor = originalColor;
      bcColor = saturationMatrix(saturation) * bcColor;
      brightnessAdjust(bcColor, brightness);
      contrastAdjust(bcColor, contrast);
      vec4 col = mix(originalColor, bcColor, amount);
      col = mix(col, vibranceAdjust(col, vibrance), amount);
      col = shiftHue(col.rgb, hue);
      fragColor = vec4(clamp(col.rgb, 0.0, 1.0), alpha);
    }`,
};

export default BCSVHShader;
