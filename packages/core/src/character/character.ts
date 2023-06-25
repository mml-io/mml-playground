import {
  AnimationAction,
  AnimationClip,
  AnimationMixer,
  Box3,
  BoxHelper,
  Color,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  Vector3,
} from "three";

import { MaterialManager } from "../rendering/materials/material-manager";

import { LocalController } from "./controller-local";
import { ModelLoader } from "./model-loader";

export type CharacterDescription = {
  meshFileUrl: string;
  idleAnimationFileUrl: string;
  jogAnimationFileUrl: string;
  sprintAnimationFileUrl: string;
  modelScale: number;
};

export type AnimationTypes = "idle" | "walk" | "run";

export class Character {
  public debug = false;

  private modelLoader: ModelLoader = new ModelLoader();

  private characterDescription: CharacterDescription;

  private debugHelper: BoxHelper | null = null;
  private boundingBox: Box3 | null = null;
  private boundingSize: Vector3 | null = null;

  private modelUrl: string;
  private modelLoadedCallback: () => void;

  private extension: string | null = null;

  private materialManager: MaterialManager = new MaterialManager();

  public controller: LocalController | null = null;

  public isLocal: boolean;
  public id: number = 0;
  public name: string | null = null;

  public model: Object3D;
  public modelScale: number;
  public head: Object3D | null = null;
  public position: Vector3 = new Vector3();
  public headPosition: Vector3 = new Vector3();

  public color: Color = new Color();

  public animationMixer: AnimationMixer | null = null;
  public animations: Record<string, AnimationAction> = {};

  constructor(
    characterDescription: CharacterDescription,
    id: number,
    isLocal: boolean,
    modelLoadedCallback: () => void,
  ) {
    this.isLocal = isLocal;
    this.id = id;
    this.characterDescription = characterDescription;
    this.modelUrl = this.characterDescription.meshFileUrl;
    this.modelScale = this.characterDescription.modelScale;
    this.modelLoadedCallback = modelLoadedCallback;

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
      model.position.y + (this.boundingSize.y > 1.0 ? this.boundingSize.y * 0.85 : 1.7),
      model.position.z,
    );
    if (this.debug === false) this.head.visible = false;
    model.add(this.head);
    model.traverse((child: Object3D) => {
      if (child.type === "SkinnedMesh") {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  async setAnimationFromFile(
    animationFileUrl: string,
    animationType: AnimationTypes,
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (this.animationMixer === null) {
        this.animationMixer = new AnimationMixer(this.model);
      }
      const animation = await this.modelLoader.load(animationFileUrl, "animation");
      if (typeof animation !== "undefined" && animation instanceof AnimationClip) {
        this.animations[animationType] = this.animationMixer.clipAction(animation);
        this.animations[animationType].stop();
        if (animationType === "idle") this.animations[animationType].play();
        resolve();
      } else {
        reject();
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
    const model = await this.modelLoader.load(this.modelUrl, "model");
    if (typeof model !== "undefined") {
      this.model = model as Object3D;
      this.preprocessModel(this.model);
      this.model.scale.x = this.model.scale.y = this.model.scale.z = this.modelScale;
      this.model.name = this.name as string;
      this.applyMaterialToAllSkinnedMeshes(this.materialManager.standardMaterial);
      if (this.isLocal) {
        await this.setAnimationFromFile(this.characterDescription.idleAnimationFileUrl, "idle");
        await this.setAnimationFromFile(this.characterDescription.jogAnimationFileUrl, "walk");
        await this.setAnimationFromFile(this.characterDescription.sprintAnimationFileUrl, "run");
        this.controller = new LocalController(
          this.model,
          this.animations,
          this.animationMixer!,
          this.id,
        );
      }
      this.modelLoadedCallback();
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

  update(time: number) {
    if (this.materialManager) {
      if (typeof this.materialManager.standardMaterialUniforms.time !== "undefined") {
        this.materialManager.standardMaterialUniforms.time.value = time;
        this.materialManager.standardMaterialUniforms.diffuseRandomColor.value = this.color;
      }
    }
    this.headPosition = this.head?.getWorldPosition(new Vector3()) || new Vector3();
    if (this.model) this.position = this.model.getWorldPosition(new Vector3());
  }
}
