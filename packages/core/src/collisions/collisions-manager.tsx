import {
  BufferGeometry,
  Color,
  FrontSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  NormalBufferAttributes,
  Object3D,
  Scene,
  Vector3,
} from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { MeshBVH, MeshBVHVisualizer } from "three-mesh-bvh";

type TBufferGeometry = BufferGeometry<NormalBufferAttributes>;
type TBufferGeometries = TBufferGeometry[];

export class CollisionsManager {
  private debug: boolean = true;
  private scene: Scene | null = null;
  private geometries: Map<string, TBufferGeometry> = new Map();

  public mergedMesh: Mesh<BufferGeometry, MeshStandardMaterial> | null = null;
  public staticCollider: Mesh<BufferGeometry, MeshStandardMaterial> | null = null;
  public collider: any = null;

  private visualizer: MeshBVHVisualizer | null = null;

  private mergeBufferGeometries: (geometries: TBufferGeometries) => TBufferGeometry;
  public toggleDebug: () => void;

  constructor() {
    this.mergeBufferGeometries = BufferGeometryUtils.mergeGeometries;

    this.toggleDebug = () => {
      this.debug = !this.debug;
      if (this.mergedMesh) this.mergedMesh.visible = this.debug;
    };
  }

  public setScene(scene: Scene) {
    if (this.scene === null) {
      this.scene = scene;
    } else {
      console.error("[CollisionsManager] error: scene already set");
    }
  }

  public addMeshesGroup(group: Group): void {
    group.traverse((child: Object3D) => {
      if (child.type === "Mesh") this.addMesh(child as Mesh);
    });
  }

  public addMesh(mesh: Mesh): void {
    const meshUUID = mesh.uuid;
    if (!this.geometries.has(meshUUID)) {
      if (this.debug) console.log(`adds collision: ${meshUUID}`);
      mesh.localToWorld(new Vector3());
      mesh.updateMatrixWorld();
      const geometry = mesh.geometry.clone();
      geometry.applyMatrix4(mesh.matrixWorld);
      this.geometries.set(meshUUID, geometry);
      this.mergeGeometries();
    }
  }

  public updateMeshesGroup(group: Group): void {
    group.traverse((child: Object3D) => {
      if (child.type === "Mesh") this.updateMesh(child as Mesh);
    });
  }

  public updateMesh(mesh: Mesh): void {
    const meshUUID = mesh.uuid;
    if (this.geometries.has(meshUUID)) {
      mesh.localToWorld(new Vector3());
      mesh.updateMatrixWorld();
      const geometry = mesh.geometry.clone();
      geometry.applyMatrix4(mesh.matrixWorld);
      this.geometries.set(meshUUID, geometry);
      this.mergeGeometries();
    }
  }

  public removeMeshesGroup(group: Group): void {
    group.traverse((child: Object3D) => {
      if (child.type === "Mesh") this.removeMesh(child as Mesh);
    });
  }

  public removeMesh(mesh: Mesh): void {
    const meshUUID = mesh.uuid;
    if (this.geometries.has(meshUUID)) {
      const successRemoving = this.geometries.delete(meshUUID);
      if (successRemoving && this.debug) console.log(`removes collision: ${meshUUID}`);
    }
    this.mergeGeometries();
  }

  public mergeGeometries(): void {
    if (this.geometries.size > 0) {
      const geometries: TBufferGeometries = Array.from(this.geometries.values());
      const newBufferGeometry = this.mergeBufferGeometries(geometries);

      this.mergedMesh = new Mesh(
        newBufferGeometry,
        new MeshStandardMaterial({ color: 0xff0000, side: FrontSide, wireframe: true }),
      );
      this.mergedMesh.visible = false;
      this.mergedMesh.geometry.boundsTree = new MeshBVH(newBufferGeometry);

      this.staticCollider = new Mesh(
        newBufferGeometry,
        new MeshStandardMaterial({ color: 0x00ffff, wireframe: true }),
      );
      this.staticCollider.updateMatrix();

      if (this.scene && this.visualizer) this.scene.remove(this.visualizer);
      this.visualizer = new MeshBVHVisualizer(this.staticCollider, 12);
      this.visualizer.edgeMaterial.color = new Color(0x0000ff);
      this.visualizer.update();
      if (this.scene) this.scene.add(this.visualizer);
    }
  }
}

export const CollisionsStore = new CollisionsManager();
