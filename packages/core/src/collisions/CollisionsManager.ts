import {
  MElement,
  MMLCollisionTrigger,
  getRelativePositionAndRotationRelativeToObject,
} from "mml-web";
import {
  Box3,
  BufferGeometry,
  Color,
  Euler,
  FrontSide,
  Group,
  Line3,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Scene,
  Vector3,
} from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { MeshBVH, MeshBVHVisualizer } from "three-mesh-bvh";

type CollisionMeshState = {
  source: Group;
  meshBVH: MeshBVH;
  visualizer: MeshBVHVisualizer | null;
};

export class CollisionsManager {
  private debug: boolean = false;
  private scene: Scene;
  private tempVector: Vector3 = new Vector3();
  private tempVector2: Vector3 = new Vector3();

  private collisionMeshState: Map<Group, CollisionMeshState> = new Map();
  private collisionTrigger: MMLCollisionTrigger;

  constructor(scene: Scene, collisionTrigger: MMLCollisionTrigger) {
    this.scene = scene;
    this.collisionTrigger = collisionTrigger;
  }

  private createCollisionMeshState(group: Group): CollisionMeshState {
    const geometries: Array<BufferGeometry> = [];
    group.traverse((child: Object3D) => {
      if (child.type === "Mesh") {
        const mesh = child as Mesh;
        mesh.localToWorld(new Vector3());
        mesh.updateMatrixWorld();
        const clonedGeometry = mesh.geometry.clone();
        clonedGeometry.applyMatrix4(mesh.matrixWorld);

        for (const key in clonedGeometry.attributes) {
          if (key !== "position") {
            clonedGeometry.deleteAttribute(key);
          }
        }
        if (clonedGeometry.index) {
          geometries.push(clonedGeometry.toNonIndexed());
        } else {
          geometries.push(clonedGeometry);
        }
      }
    });
    const newBufferGeometry = BufferGeometryUtils.mergeGeometries(geometries);
    const meshBVH = new MeshBVH(newBufferGeometry);

    if (!this.debug) {
      return { source: group, visualizer: null, meshBVH };
    }

    const mergedMesh = new Mesh(
      newBufferGeometry,
      new MeshStandardMaterial({ color: 0xff0000, side: FrontSide, wireframe: true }),
    );
    mergedMesh.geometry.boundsTree = meshBVH;
    const visualizer = new MeshBVHVisualizer(mergedMesh, 3);
    visualizer.edgeMaterial.color = new Color(0x0000ff);
    visualizer.update();
    return { source: group, visualizer, meshBVH };
  }

  public addMeshesGroup(group: Group, mElement?: MElement): void {
    if (mElement) {
      this.collisionTrigger.addCollider(group, mElement);
    }
    const meshState = this.createCollisionMeshState(group);
    if (meshState.visualizer) {
      this.scene.add(meshState.visualizer);
    }
    this.collisionMeshState.set(group, meshState);
  }

  public updateMeshesGroup(group: Group): void {
    const meshState = this.collisionMeshState.get(group);
    if (meshState) {
      const newMeshState = this.createCollisionMeshState(group);
      if (meshState.visualizer) {
        this.scene.remove(meshState.visualizer);
      }
      if (newMeshState.visualizer) {
        this.scene.add(newMeshState.visualizer);
      }
      this.collisionMeshState.set(group, newMeshState);
    }
  }

  public removeMeshesGroup(group: Group): void {
    this.collisionTrigger.removeCollider(group);
    const meshState = this.collisionMeshState.get(group);
    if (meshState) {
      if (meshState.visualizer) {
        this.scene.remove(meshState.visualizer);
      }
      this.collisionMeshState.delete(group);
    }
  }

  private applyCollider(
    tempSegment: Line3,
    radius: number,
    boundingBox: Box3,
    meshState: CollisionMeshState,
  ): Vector3 | null {
    let collisionPosition: Vector3 | null = null;
    meshState.meshBVH.shapecast({
      intersectsBounds: (box) => box.intersectsBox(boundingBox),
      intersectsTriangle: (tri) => {
        const triPoint = this.tempVector;
        const capsulePoint = this.tempVector2;
        const distance = tri.closestPointToSegment(tempSegment, triPoint, capsulePoint);
        if (distance < radius) {
          const depth = radius - distance;
          collisionPosition = new Vector3().copy(capsulePoint);
          const direction = capsulePoint.sub(triPoint).normalize();
          tempSegment.start.addScaledVector(direction, depth);
          tempSegment.end.addScaledVector(direction, depth);
        }
      },
    });
    return collisionPosition;
  }

  public applyColliders(tempSegment: Line3, radius: number, boundingBox: Box3) {
    let collidedElements: Map<
      Object3D,
      {
        position: { x: number; y: number; z: number };
      }
    > | null = null;
    for (const meshState of this.collisionMeshState.values()) {
      const collisionPosition = this.applyCollider(tempSegment, radius, boundingBox, meshState);
      if (collisionPosition) {
        if (collidedElements === null) {
          collidedElements = new Map();
        }
        const relativePosition = getRelativePositionAndRotationRelativeToObject(
          {
            position: collisionPosition,
            rotation: new Euler(),
          },
          meshState.source,
        );
        collidedElements.set(meshState.source, {
          position: relativePosition.position,
        });
      }
    }

    this.collisionTrigger.setCurrentCollisions(collidedElements);
  }
}
