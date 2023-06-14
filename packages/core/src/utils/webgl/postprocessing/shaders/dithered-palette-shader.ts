import { Vector2 } from "three";

import { type IDitheredPaletteShader } from "../../types";

import vertexShader from "./vertex-shader";

const DitheredPaletteShader: IDitheredPaletteShader = {
  shaderID: "DitheredPalettePass",
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new Vector2() },
    pixelScale: { value: 2 },
    ditherAmount: { value: 1.0 },
    paletteAmount: { value: 1.0 },
    alpha: { value: 0.0 },
  },
  vertexShader,
  fragmentShader: /* glsl */ `#version 300 es
    precision highp float;

    in vec2 vUv;
    out vec4 fragColor;

    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float pixelScale;
    uniform float ditherAmount;
    uniform float paletteAmount;
    uniform float alpha;

    // Can work with up to 256 distinct colors
    const vec4[] palette = vec4[] (
      vec4(039.0 / 255.0, 039.0 / 255.0, 068.0 / 255.0, 1.0),
      vec4(073.0 / 255.0, 077.0 / 255.0, 126.0 / 255.0, 1.0),
      vec4(139.0 / 255.0, 109.0 / 255.0, 156.0 / 255.0, 1.0),
      vec4(198.0 / 255.0, 159.0 / 255.0, 165.0 / 255.0, 1.0),
      vec4(242.0 / 255.0, 211.0 / 255.0, 171.0 / 255.0, 1.0),
      vec4(251.0 / 255.0, 245.0 / 255.0, 239.0 / 255.0, 1.0)
    );

    const int colors = int(palette.length());

    const float dither_spread = 1.0 / float(colors);

    const mat4x4 threshold = mat4x4(
      00.0, 08.0, 02.0, 10.0,
      12.0, 04.0, 14.0, 06.0,
      03.0, 11.0, 01.0, 09.0,
      15.0, 07.0, 13.0, 05.0
    );

    vec4 applyPalette(float lum) {
      lum = floor(lum * float(colors));
      return palette[int(lum)];
    }

    void main(void) {
      float pixelSizeX = 1.0 / resolution.x;
      float pixelSizeY = 1.0 / resolution.y;
      float cellSizeX = pow(2.0, pixelScale) * pixelSizeX;
      float cellSizeY = pow(2.0, pixelScale) * pixelSizeY;

      vec2 uv = vUv;
      float u = cellSizeX * floor(uv.x / cellSizeX);
      float v = cellSizeY * floor(uv.y / cellSizeY);

      vec4 oCol = texture(tDiffuse, vUv);
      vec4 col = texture(tDiffuse, vec2(u, v));

      // https://en.wikipedia.org/wiki/Ordered_dithering
      int x = int(u / cellSizeX) % 4;
      int y = int(v / cellSizeY) % 4;
      col.r = col.r + (dither_spread * ((threshold[x][y] / 16.0) - 0.5));
      col.g = col.g + (dither_spread * ((threshold[x][y] / 16.0) - 0.5));
      col.b = col.b + (dither_spread * ((threshold[x][y] / 16.0) - 0.5));

      col.r = floor(col.r * float(colors - 1) + 0.5) / float(colors - 1);
      col.g = floor(col.g * float(colors - 1) + 0.5) / float(colors - 1);
      col.b = floor(col.b * float(colors - 1) + 0.5) / float(colors - 1);

      col = mix(oCol, col, ditherAmount);

      oCol = col;
      float lum = (0.299 * col.r + 0.587 * col.g + 0.114 * col.b);
      col = applyPalette(lum);
      col = mix(oCol, col, paletteAmount);
      fragColor = vec4(col.rgb, col.a * alpha);
    }
  `,
};

export default DitheredPaletteShader;
