import {
  type Color,
  type MagnificationTextureFilter,
  type Material,
  type PixelFormat,
  type RawShaderMaterial,
  type Shader,
  type ShaderMaterial,
  type Texture,
  type TextureDataType,
  type TextureFilter,
  type Vector2,
  type Vector3,
  type WebGLRenderer,
} from "three";

export type TLooseObject = {
  [key: string]: any;
};

export interface TSceneProps {
  width: number;
  height: number;
  renderer: WebGLRenderer;
  isMobile: boolean;
}

export type TUniform<TValue = any> = { value: TValue };

export type TUniforms = { [key: string]: TUniform };

type TDefines = { [key: string]: boolean | number | string };

export interface IShader<U extends TUniforms, D extends TDefines | undefined = undefined>
  extends Shader {
  shaderID?: string | undefined;
  defines?: D;
  uniforms: U;
  vertexShader: string;
  fragmentShader: string;
}

export interface IMaterial extends Material {
  uniforms: Record<string, TUniform>;
}

export type TShaderPassShader = Partial<RawShaderMaterial> | Partial<ShaderMaterial>;

type AdditiveShaderUniforms = {
  tBase: TUniform<Texture | null>;
  tAdd: TUniform<Texture | null>;
  fCoeff: TUniform<number>;
};

export interface IAddShader extends IShader<AdditiveShaderUniforms> {}

type AfterImageShaderUniforms = {
  damp: TUniform<number>;
  tOld: TUniform<Texture | null>;
  tNew: TUniform<Texture | null>;
};

export interface IAfterImageShader extends IShader<AfterImageShaderUniforms> {}

type ASCIIShaderUniforms = {
  tDiffuse: TUniform<Texture | null>;
  resolution: TUniform<Vector2>;
  zoom: TUniform<number>;
  uvamount: TUniform<number>;
  amount: TUniform<number>;
  alpha: TUniform<number>;
};

export interface IASCIIShader extends IShader<ASCIIShaderUniforms> {}

type TBadCRTShaderUniforms = {
  tDiffuse: TUniform<Texture | null>;
  noiseTexture: TUniform<Texture | null>;
  resolution: TUniform<Vector2>;
  curveAmount: TUniform<number>;
  scanLinesAmount: TUniform<number>;
  time: TUniform<number>;
  horizontalGlitch: TUniform<number>;
  verticalGlitch: TUniform<number>;
  extraGrain: TUniform<number>;
  shiftBias: TUniform<number>;
  rgbShiftSpeed: TUniform<number>;
  rgbShiftAmplitude: TUniform<number>;
  amount: TUniform<number>;
  alpha: TUniform<number>;
};

export interface IBadCRTShader extends IShader<TBadCRTShaderUniforms> {}

type BCSVHShaderUniforms = {
  tDiffuse: TUniform<Texture | null>;
  brightness: TUniform<number>;
  contrast: TUniform<number>;
  saturation: TUniform<number>;
  vibrance: TUniform<number>;
  hue: TUniform<number>;
  amount: TUniform<number>;
  alpha: TUniform<number>;
};

export interface IBCSVHShader extends IShader<BCSVHShaderUniforms> {}

type CopyShaderUniforms = {
  opacity: TUniform<number>;
  tDiffuse: TUniform<Texture | null>;
};

export interface ICopyShader extends IShader<CopyShaderUniforms> {}

type TCRTShaderUniforms = {
  tDiffuse: TUniform<Texture | null>;
  emulatedResolution: TUniform<Vector2>;
  warpAmount: TUniform<Vector2>;
  warpMix: TUniform<number>;
  hardScanlinesValue: TUniform<number>;
  hardPixelsValue: TUniform<number>;
  maskDark: TUniform<number>;
  maskLight: TUniform<number>;
  vignetteAmount: TUniform<number>;
  amount: TUniform<number>;
};

export interface ICRTShader extends IShader<TCRTShaderUniforms> {}

type CurveShaderUniforms = {
  tDiffuse: TUniform<Texture | null>;
  amount: TUniform<number>;
  vigAmount: TUniform<number>;
  alpha: TUniform<number>;
};

export interface ICurveShader extends IShader<CurveShaderUniforms> {}

type DitherShaderUniforms = {
  tDiffuse: TUniform<Texture | null>;
  time: TUniform<number>;
  size: TUniform<number>;
  amount: TUniform<number>;
  alpha: TUniform<number>;
};

export interface IDitherShader extends IShader<DitherShaderUniforms> {}

type DitheredPaletteShaderUniforms = {
  tDiffuse: TUniform<Texture | null>;
  resolution: TUniform<Vector2>;
  pixelScale: TUniform<number>;
  ditherAmount: TUniform<number>;
  paletteAmount: TUniform<number>;
  alpha: TUniform<number>;
};

export interface IDitheredPaletteShader extends IShader<DitheredPaletteShaderUniforms> {}

type FXAAShaderPassUniforms = {
  tDiffuse: TUniform<Texture | null>;
  resolution: TUniform<Vector2>;
};

export interface IFXAAShader extends IShader<FXAAShaderPassUniforms> {}

type GaussGrainShaderUniforms = {
  tDiffuse: TUniform<Texture | null>;
  resolution: TUniform<Vector2>;
  time: TUniform<number>;
  amount: TUniform<number>;
  alpha: TUniform<number>;
};

export interface IGaussGrainShader extends IShader<GaussGrainShaderUniforms> {}

type LuminosityHighPassShaderUniforms = {
  tDiffuse: TUniform<Texture | null>;
  luminosityThreshold: TUniform<number>;
  smoothWidth: TUniform<number>;
  defaultColor: TUniform<Color>;
  defaultOpacity: TUniform<number>;
};

export interface ILuminosityShader extends IShader<LuminosityHighPassShaderUniforms> {}

type RGBShiftShaderUniforms = {
  tDiffuse: TUniform<Texture | null>;
  amount: TUniform<number>;
  angle: TUniform<number>;
  alpha: TUniform<number>;
};

export interface IRGBShiftShader extends IShader<RGBShiftShaderUniforms> {}

type TintShaderUniforms = {
  tDiffuse: TUniform<Texture | null>;
  tint: TUniform<Vector3>;
  amount: TUniform<number>;
  alpha: TUniform<number>;
};

export interface ITintShader extends IShader<TintShaderUniforms> {}

export type TTargetParameters = {
  minFilter: TextureFilter;
  magFilter: MagnificationTextureFilter;
  format: PixelFormat;
  type: TextureDataType;
  stencilBuffer: boolean;
};
