import { Vector2 } from "three";

import { type IFXAAShader } from "../../types";

import vertexShader from "./vertex-shader";

const FXAAShader: IFXAAShader = {
  shaderID: "FXAAPass",
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new Vector2(1 / 1024, 1 / 512) },
  },
  vertexShader,
  fragmentShader: /* glsl */ `#version 300 es
    precision highp float;
    in vec2 vUv;
    out vec4 fragColor;
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;

    #ifndef FXAA_DISCARD
      #define FXAA_DISCARD 0
    #endif

    #define FxaaTexTop(t, p) texture(t, p, -16.0)
    #define FxaaTexOff(t, p, o, r) texture(t, p + (o * r), -16.0)
    #define NUM_SAMPLES 5

    float contrast(vec4 a, vec4 b) {
      vec4 diff = abs(a - b);
      return max(max(max(diff.r, diff.g), diff.b), diff.a);
    }

    vec4 FxaaPixelShader(
      vec2 posM,
      sampler2D tex,
      vec2 fxaaQualityRcpFrame,
      float fxaaQualityEdgeThreshold,
      float fxaaQualityinvEdgeThreshold
    ) {
      vec4 rgbaM = FxaaTexTop(tex, posM);
      vec4 rgbaS = FxaaTexOff(tex, posM, vec2(+0.0, +1.0), fxaaQualityRcpFrame.xy);
      vec4 rgbaE = FxaaTexOff(tex, posM, vec2(+1.0, +0.0), fxaaQualityRcpFrame.xy);
      vec4 rgbaN = FxaaTexOff(tex, posM, vec2(+0.0, -1.0), fxaaQualityRcpFrame.xy);
      vec4 rgbaW = FxaaTexOff(tex, posM, vec2(-1.0, +0.0), fxaaQualityRcpFrame.xy);
      bool earlyExit = max(
        max(max(
          contrast(rgbaM, rgbaN),
          contrast(rgbaM, rgbaS)),
          contrast(rgbaM, rgbaE)),
          contrast(rgbaM, rgbaW)
        ) < fxaaQualityEdgeThreshold;

      #if (FXAA_DISCARD == 1)
        if(earlyExit) FxaaDiscard;
      #else
        if(earlyExit) return rgbaM;
      #endif

      float contrastN = contrast(rgbaM, rgbaN);
      float contrastS = contrast(rgbaM, rgbaS);
      float contrastE = contrast(rgbaM, rgbaE);
      float contrastW = contrast(rgbaM, rgbaW);

      float relativeVContrast = (contrastN + contrastS) - (contrastE + contrastW);
      relativeVContrast *= fxaaQualityinvEdgeThreshold;

      bool horzSpan = relativeVContrast > 0.0;

      if (abs(relativeVContrast) < 0.3) {
        vec2 dirToEdge;
        dirToEdge.x = contrastE > contrastW ? 1.0 : -1.0;
        dirToEdge.y = contrastS > contrastN ? 1.0 : -1.0;
        vec4 rgbaAlongH = FxaaTexOff(tex, posM, vec2(dirToEdge.x, -dirToEdge.y), fxaaQualityRcpFrame.xy);
        float matchAlongH = contrast(rgbaM, rgbaAlongH);
        vec4 rgbaAlongV = FxaaTexOff(tex, posM, vec2(-dirToEdge.x, dirToEdge.y), fxaaQualityRcpFrame.xy);
        float matchAlongV = contrast(rgbaM, rgbaAlongV);
        relativeVContrast = matchAlongV - matchAlongH;
        relativeVContrast *= fxaaQualityinvEdgeThreshold;
        if (abs(relativeVContrast) < 0.3 ) {
          return mix(
            rgbaM,
            (rgbaN + rgbaS + rgbaE + rgbaW) * 0.25,
            0.4
          );
        }
        horzSpan = relativeVContrast > 0.0;
      }

      if (!horzSpan) rgbaN = rgbaW;
      if (!horzSpan) rgbaS = rgbaE;

      bool pairN = contrast(rgbaM, rgbaN) > contrast(rgbaM, rgbaS);
      if (!pairN) rgbaN = rgbaS;

      vec2 offNP;
      offNP.x = (!horzSpan) ? 0.0 : fxaaQualityRcpFrame.x;
      offNP.y = ( horzSpan) ? 0.0 : fxaaQualityRcpFrame.y;

      bool doneN = false;
      bool doneP = false;
      float nDist = 0.0;
      float pDist = 0.0;
      vec2 posN = posM;
      vec2 posP = posM;

      int iterationsUsed = 0;
      int iterationsUsedN = 0;
      int iterationsUsedP = 0;

      for (int i = 0; i < NUM_SAMPLES; i++) {
        iterationsUsed = i;
        float increment = float(i + 1);
        if(!doneN) {
          nDist += increment;
          posN = posM + offNP * nDist;
          vec4 rgbaEndN = FxaaTexTop(tex, posN.xy);
          doneN = contrast(rgbaEndN, rgbaM) > contrast(rgbaEndN, rgbaN);
          iterationsUsedN = i;
        }
        if(!doneP) {
          pDist += increment;
          posP = posM - offNP * pDist;
          vec4 rgbaEndP = FxaaTexTop(tex, posP.xy);
          doneP = contrast(rgbaEndP, rgbaM) > contrast(rgbaEndP, rgbaN);
          iterationsUsedP = i;
        }
        if(doneN || doneP) break;
      }

      if (!doneP && !doneN) return rgbaM;

      float dist = min(
        doneN ? float(iterationsUsedN) / float(NUM_SAMPLES - 1) : 1.0,
        doneP ? float(iterationsUsedP) / float(NUM_SAMPLES - 1) : 1.0
      );

      dist = pow(dist, 0.5);
      dist = 1.0 - dist;

      return mix(rgbaM, rgbaN, dist * 0.5);
    }
    void main(void) {
      const float edgeDetectionQuality = 0.2;
      const float invEdgeDetectionQuality = 1.0 / edgeDetectionQuality;
      fragColor = FxaaPixelShader(
        vUv,
        tDiffuse,
        resolution,
        edgeDetectionQuality,
        invEdgeDetectionQuality
      );
    }`,
};

export default FXAAShader;
