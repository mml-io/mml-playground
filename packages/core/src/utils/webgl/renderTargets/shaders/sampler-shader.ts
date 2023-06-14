const samplerShader: string = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D tDiffuse;
void main(void) {
  fragColor = texture(tDiffuse, vUv);
}`;

export default samplerShader;
