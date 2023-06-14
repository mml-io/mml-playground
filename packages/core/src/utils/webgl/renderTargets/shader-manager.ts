import { BufferGeometry, Float32BufferAttribute, Mesh, RawShaderMaterial, Scene } from "three";

import vertexShader from "../postprocessing/shaders/vertex-shader";
import { type TUniforms } from "../types";

class ShaderManager {
  vertexShader: string;
  uniforms: TUniforms;
  material: RawShaderMaterial;
  scene: Scene;
  geometry: BufferGeometry = new BufferGeometry();
  mesh: Mesh<BufferGeometry, RawShaderMaterial>;

  constructor(fragmentShader: string, uniforms: TUniforms) {
    this.vertexShader = vertexShader;
    this.uniforms = uniforms;

    this.material = new RawShaderMaterial({
      vertexShader: this.vertexShader,
      fragmentShader,
      uniforms: this.uniforms,
    });

    this.scene = new Scene();
    this.geometry.setAttribute(
      "position",
      new Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3),
    );
    this.geometry.setAttribute("uv", new Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2));
    this.mesh = new Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);
    this.dispose = this.dispose.bind(this);
    this.update = this.update.bind(this);
  }

  dispose(): void {
    this.scene.remove(this.mesh);
    this.material.dispose();
    this.geometry.dispose();
  }

  update(fragmentShader: string, uniforms: TUniforms): void {
    this.dispose();
    this.geometry = new BufferGeometry();
    this.geometry.setAttribute(
      "position",
      new Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3),
    );
    this.geometry.setAttribute("uv", new Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2));
    this.material = new RawShaderMaterial({
      vertexShader: this.vertexShader,
      fragmentShader,
      uniforms,
    });
    this.mesh = new Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);
  }
}

export default ShaderManager;
