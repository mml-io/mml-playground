const vertexShader = /* glsl */ `#version 300 es
precision highp float;
in vec2 uv;
in vec3 position;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export default vertexShader;
