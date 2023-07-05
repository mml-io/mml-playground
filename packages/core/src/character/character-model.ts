import {
  AnimationAction,
  AnimationClip,
  AnimationMixer,
  LoopRepeat,
  Mesh,
  MeshStandardMaterial,
  Object3D,
} from "three";

import { CharacterDescription } from "./character";
import { CharacterMaterial } from "./character-material";
import { ModelLoader } from "./model-loader";

export type AnimationType = "idle" | "walk" | "run";

export class CharacterModel {
  private characterDescription: CharacterDescription;
  private modelLoader: ModelLoader = new ModelLoader();

  public mesh: Object3D | null = null;
  public animations: Record<string, AnimationAction> = {};
  public animationMixer: AnimationMixer | null = null;

  public material: CharacterMaterial = new CharacterMaterial();

  public currentAnimation: AnimationType = "idle";

  constructor(characterDescription: CharacterDescription) {
    this.characterDescription = characterDescription;
  }

  setShadows(mesh: Object3D, castShadow: boolean = true, receiveShadow: boolean = true): void {
    mesh.traverse((child: Object3D) => {
      if (child.type === "SkinnedMesh") {
        child.castShadow = castShadow;
        child.receiveShadow = receiveShadow;
      }
    });
  }

  hideMaterialByMeshName(meshName: any): void {
    if (!this.mesh) return;
    this.mesh.traverse((child: Object3D) => {
      if (child.type === "SkinnedMesh" && child.name === meshName) {
        (child as Mesh).material = new MeshStandardMaterial({
          color: 0xff0000,
          transparent: true,
          opacity: 0,
        });
      }
    });
  }

  applyMaterialToAllSkinnedMeshes(material: any): void {
    if (!this.mesh) return;
    this.mesh.traverse((child: Object3D) => {
      if (child.type === "SkinnedMesh") {
        (child as Mesh).material = material;
      }
    });
  }

  initAnimationMixer() {
    if (this.animationMixer !== null || this.mesh === null) return;
    this.animationMixer = new AnimationMixer(this.mesh);
  }

  async loadMainMesh(): Promise<void> {
    const mainMeshUrl = this.characterDescription.meshFileUrl;
    const scale = this.characterDescription.modelScale;
    const extension = mainMeshUrl.split(".").pop();
    const name = mainMeshUrl.split("/").pop()!.replace(`.${extension}`, "");
    const mainMesh = await this.modelLoader.load(mainMeshUrl, "model");
    if (typeof mainMesh !== "undefined") {
      this.mesh = new Object3D();
      const model = mainMesh as Object3D;
      model.position.set(0, -0.35, 0);
      this.mesh.add(model);
      this.mesh.name = name;
      this.mesh.scale.set(scale, scale, scale);
      this.setShadows(this.mesh);
    }
  }

  async setAnimationFromFile(
    animationFileUrl: string,
    animationType: AnimationType,
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      this.initAnimationMixer();
      const animation = await this.modelLoader.load(animationFileUrl, "animation");
      if (typeof animation !== "undefined" && animation instanceof AnimationClip) {
        this.animations[animationType] = this.animationMixer!.clipAction(animation);
        this.animations[animationType].stop();
        if (animationType === "idle") this.animations[animationType].play();
        resolve();
      } else {
        reject(`failed to load ${animationType} from ${animationFileUrl}`);
      }
    });
  }

  transitionToAnimation(targetAnimation: AnimationType, transitionDuration: number = 0.21): void {
    if (!this.mesh || this.currentAnimation === null) return;

    const currentAction = this.animations[this.currentAnimation];
    const targetAction = this.animations[targetAnimation];

    if (!targetAction) return;

    if (currentAction) {
      currentAction.enabled = true;
      currentAction.fadeOut(transitionDuration);
    }

    if (!targetAction.isRunning()) targetAction.play();

    targetAction.setLoop(LoopRepeat, Infinity);
    targetAction.enabled = true;
    targetAction.fadeIn(transitionDuration);

    this.currentAnimation = targetAnimation;
  }

  async init(): Promise<void> {
    await this.loadMainMesh();
    await this.setAnimationFromFile(this.characterDescription.idleAnimationFileUrl, "idle");
    await this.setAnimationFromFile(this.characterDescription.jogAnimationFileUrl, "walk");
    await this.setAnimationFromFile(this.characterDescription.sprintAnimationFileUrl, "run");
    this.applyMaterialToAllSkinnedMeshes(this.material);
  }

  updateAnimation(targetAnimation: AnimationType, deltaTime: number) {
    if (this.currentAnimation !== targetAnimation) {
      this.transitionToAnimation(targetAnimation);
    }
    this.animationMixer?.update(deltaTime);
  }
}
