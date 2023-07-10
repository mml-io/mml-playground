import {
  AnimationAction,
  AnimationClip,
  AnimationMixer,
  LoadingManager,
  Object3D,
  Quaternion,
  Vector2,
  Vector3,
} from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { type AnimationState, type ClientUpdate } from "../network";

import { Character } from "./character";

export type AnimationTypes = "idle" | "walk" | "run";

export class RemoteController {
  public id: number = 0;
  public currentAnimation: string = "idle";

  public character: Character | null = null;
  public characterModel: Object3D | null = null;

  private animationMixer: AnimationMixer = new AnimationMixer(new Object3D());
  private animations: Record<string, AnimationAction> = {};
  private loadManager: LoadingManager = new LoadingManager();

  private fbxLoader: FBXLoader = new FBXLoader(this.loadManager);
  private gltfLoader: GLTFLoader = new GLTFLoader(this.loadManager);

  public networkState: ClientUpdate = {
    id: 0,
    location: new Vector3(),
    rotation: new Vector2(),
    state: this.currentAnimation as AnimationState,
  };

  constructor(character: Character, id: number) {
    this.id = id;
    this.character = character;
    this.characterModel = this.character.model!.mesh!;
    this.animationMixer = new AnimationMixer(this.characterModel);
  }

  setAnimationFromFile(animationType: AnimationTypes, fileName: string): void {
    const animationFile = `${fileName}`;
    const extension = fileName.split(".").pop();
    if (typeof extension !== "string") {
      console.error(`Error: could not recognize extension of animation: ${animationFile}`);
      return;
    }
    if (["gltf", "glb"].includes(extension)) {
      this.gltfLoader.load(
        animationFile,
        (anim) => {
          const animation = anim.animations[0] as AnimationClip;
          this.animations[animationType] = this.animationMixer.clipAction(animation);
          this.animations[animationType].stop();
          if (animationType === "idle") this.animations[animationType].play();
        },
        undefined,
        (error) => console.error(`Error loading ${animationFile}: ${error}`),
      );
    } else if (["fbx"].includes(extension)) {
      this.fbxLoader.load(
        animationFile,
        (anim) => {
          const animation = anim.animations[0] as AnimationClip;
          this.animations[animationType] = this.animationMixer.clipAction(animation);
          if (animationType === "idle") this.animations[animationType].play();
        },
        undefined,
        (error) => console.error(`Error loading ${animationFile}: ${error}`),
      );
    }
  }

  transitionToAnimation(targetAnimation: string, transitionDuration: number = 0.21): void {
    if (this.currentAnimation === targetAnimation) return;

    const currentAction = this.animations[this.currentAnimation];
    const targetAction = this.animations[targetAnimation];

    if (!targetAction) return;

    if (currentAction) {
      currentAction.enabled = true;
      targetAction
        .reset()
        .setEffectiveTimeScale(1)
        .setEffectiveWeight(1)
        .fadeIn(transitionDuration)
        .play();
      currentAction.crossFadeTo(targetAction, transitionDuration, true);
    } else {
      targetAction.play();
    }

    this.currentAnimation = targetAnimation;
  }

  updateFromNetwork(clientUpdate: ClientUpdate): void {
    if (!this.characterModel) return;
    const { location, rotation, state } = clientUpdate;
    this.characterModel.position.x = location.x;
    this.characterModel.position.y = location.y;
    this.characterModel.position.z = location.z;
    const rotationQuaternion = new Quaternion(0, rotation.x, 0, rotation.y);
    this.characterModel.setRotationFromQuaternion(rotationQuaternion);
    if (state !== this.currentAnimation) {
      this.transitionToAnimation(state);
    }
  }

  update(clientUpdate: ClientUpdate, time: number, deltaTime: number): void {
    if (!this.character) return;
    this.character.update(time);
    this.updateFromNetwork(clientUpdate);
    this.animationMixer.update(deltaTime);
  }
}
