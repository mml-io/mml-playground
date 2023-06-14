import {
  Box3,
  BoxHelper,
  Color,
  LoadingManager,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  Vector2,
  Vector3,
} from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { BasicCharacterController } from "./basic-character-controller";
import { MaterialManager } from "./material-manager";
import { RunTime } from "./run-time-controller";

export type CharacterDescription = {
  meshFileUrl: string;
  idleAnimationFileUrl: string;
  jogAnimationFileUrl: string;
  sprintAnimationFileUrl: string;
};

export class Character {
  public debug = false;

  private debugHelper: BoxHelper | null = null;
  private boundingBox: Box3 | null = null;
  private boundingSize: Vector3 | null = null;

  private loadingManager: LoadingManager;
  private fbxLoader: FBXLoader;
  private gltfLoader: GLTFLoader;

  private modelUrl: string;
  private modelLoadedCallback: () => void;

  private extension: string | null = null;
  private modelContent: Record<string, number | string> = {};

  private materialManager: MaterialManager = new MaterialManager();

  public controller: BasicCharacterController | null = null;

  public id: number = 0;
  public name: string | null = null;
  public model: Object3D;
  public head: Object3D | null = null;
  public position: Vector3 = new Vector3();
  public headPosition: Vector3 = new Vector3();

  public color: Color = new Color();

  constructor(modelUrl: string, id: number, modelLoadedCallback: () => void) {
    this.id = id;
    this.modelUrl = modelUrl;
    this.modelLoadedCallback = modelLoadedCallback;

    this.loadingManager = new LoadingManager();
    this.fbxLoader = new FBXLoader(this.loadingManager);
    this.gltfLoader = new GLTFLoader(this.loadingManager);
    this.color = this.materialManager.colorsCube216[id];
    this.load();
  }

  preprocessModel(model: Object3D): void {
    if (this.debug === true) {
      this.debugHelper = new BoxHelper(model, 0xffff00);
      model.add(this.debugHelper);
    }
    this.boundingBox = new Box3().setFromObject(model);
    this.boundingSize = this.boundingBox.getSize(new Vector3());
    this.head = new Mesh(
      new SphereGeometry(0.12, 6, 6),
      new MeshStandardMaterial({ color: 0xffff00, wireframe: true }),
    );
    this.head.position.set(
      model.position.x,
      model.position.y + this.boundingSize.y * 0.85,
      model.position.z,
    );
    if (this.debug === false) this.head.visible = false;
    model.add(this.head);
    model.traverse((child: Object3D) => {
      if (child.type === "SkinnedMesh") {
        child.castShadow = true;
        child.receiveShadow = true;
      }
      if (!(child.type in this.modelContent)) {
        this.modelContent[child.type] = 1;
      } else {
        if (typeof this.modelContent[child.type] === "number") {
          (this.modelContent[child.type] as number)++;
        }
      }
    });
  }

  async load(): Promise<void> {
    this.extension = this.modelUrl.split(".").pop()!;
    this.name = this.modelUrl.split("/").pop()!.replace(`.${this.extension!}`, "");
    if (!this.extension) {
      console.error(`Error: unrecognized model type at ${this.modelUrl}`);
      return;
    }
    if (["gltf", "glb"].includes(this.extension)) {
      this.gltfLoader.load(
        this.modelUrl,
        (object: GLTF) => {
          this.model = object.scene as Object3D;
          this.preprocessModel(this.model);
          this.model.name = this.name as string;
          this.model.animations = object.animations;
          this.modelContent.name = this.model.name;
          this.applyMaterialToAllSkinnedMeshes(this.materialManager.standardMaterial);
          this.modelLoadedCallback();
        },
        undefined,
        (error) => console.log(`Error loading ${this.modelUrl}: ${error}`),
      );
    } else if (this.extension === "fbx") {
      this.fbxLoader.load(
        this.modelUrl,
        (object: Object3D) => {
          this.model = object as Object3D;
          this.preprocessModel(this.model);
          this.model.name = this.name as string;
          this.modelContent.name = this.model.name;
          this.modelLoadedCallback();
        },
        undefined,
        (error) => console.log(`Error loading ${this.modelUrl}: ${error}`),
      );
    } else {
      console.error(`Error: unrecognized extension type at ${this.modelUrl}`);
      return;
    }
  }

  setHeadTargetToBone(boneName: string): void {
    this.model.traverse((child: Object3D) => {
      if (child.type === "Bone" && child.name === boneName) {
        this.head = child;
      }
    });
  }

  replaceMaterialByMeshName(meshName: string, material: any): void {
    this.model.traverse((child: Object3D) => {
      if (child.name === meshName) {
        (child as Mesh).material = material;
      }
    });
  }

  applyMaterialToAllSkinnedMeshes(material: any): void {
    this.model.traverse((child: Object3D) => {
      if (child.type === "SkinnedMesh") {
        (child as Mesh).material = material;
      }
    });
  }

  hideMaterialByMeshName(meshName: any): void {
    this.model.traverse((child: Object3D) => {
      if (child.type === "SkinnedMesh" && child.name === meshName) {
        (child as Mesh).material = new MeshStandardMaterial({
          color: 0xff0000,
          transparent: true,
          opacity: 0,
        });
      }
    });
  }

  update(runTime: RunTime, resolution: Vector2) {
    if (this.materialManager) {
      if (typeof this.materialManager.standardMaterialUniforms.time !== "undefined") {
        this.materialManager.standardMaterialUniforms.time.value = runTime.time;
        this.materialManager.standardMaterialUniforms.resolution.value = resolution;
        this.materialManager.standardMaterialUniforms.diffuseRandomColor.value = this.color;
      }
    }
    this.headPosition = this.head?.getWorldPosition(new Vector3()) || new Vector3();
    if (this.model) this.position = this.model.getWorldPosition(new Vector3());
  }
}
