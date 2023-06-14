import type { Material, WebGLRenderer } from "three";
import { BufferGeometry, Float32BufferAttribute, Mesh, OrthographicCamera } from "three";

class FullScreenQuad<TMaterial extends Material> {
  mesh: Mesh<BufferGeometry, TMaterial>;
  geometry: BufferGeometry = new BufferGeometry();
  camera: OrthographicCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  constructor(material?: TMaterial) {
    const pos: number[] = [-1, 3, 0, -1, -1, 0, 3, -1, 0];
    const uv: number[] = [0, 2, 0, 0, 2, 0];
    this.geometry.setAttribute("position", new Float32BufferAttribute(pos, 3));
    this.geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
    this.mesh =
      material !== undefined
        ? new Mesh(this.geometry, material)
        : (this.mesh = new Mesh(this.geometry));
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
  }

  public render(renderer: WebGLRenderer): void {
    renderer.render(this.mesh, this.camera);
  }

  public get material(): TMaterial {
    return this.mesh.material;
  }

  public set material(value: TMaterial) {
    this.mesh.material = value;
  }
}

export default FullScreenQuad;
