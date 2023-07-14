import { AnimationState, CharacterNetworkClientUpdate } from "@mml-playground/character-network";
import {
  AnimationAction,
  AnimationClip,
  AnimationMixer,
  LoadingManager,
  Object3D,
  Quaternion,
  Vector3,
} from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { Character } from "./Character";

export class RemoteController {
  public characterModel: Object3D | null = null;
  private loadManager: LoadingManager = new LoadingManager();

  private animationMixer: AnimationMixer = new AnimationMixer(new Object3D());
  private animations = new Map<AnimationState, AnimationAction>();
  public currentAnimation: AnimationState = AnimationState.idle;

  private fbxLoader: FBXLoader = new FBXLoader(this.loadManager);
  private gltfLoader: GLTFLoader = new GLTFLoader(this.loadManager);

  public networkState: CharacterNetworkClientUpdate = {
    id: 0,
    position: { x: 0, y: 0, z: 0 },
    rotation: { quaternionY: 0, quaternionW: 0 },
    state: this.currentAnimation as AnimationState,
  };

  constructor(public readonly character: Character, public readonly id: number) {
    this.characterModel = this.character.model!.mesh!;
    this.animationMixer = new AnimationMixer(this.characterModel);
  }

  public update(clientUpdate: CharacterNetworkClientUpdate, time: number, deltaTime: number): void {
    if (!this.character) return;
    this.character.update(time);
    this.updateFromNetwork(clientUpdate);
    this.animationMixer.update(deltaTime);
  }

  public setAnimationFromFile(animationType: AnimationState, fileName: string): void {
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
          const animationAction = this.animationMixer.clipAction(animation);
          this.animations.set(animationType, animationAction);
          if (animationType === AnimationState.idle) {
            animationAction.play();
          }
        },
        undefined,
        (error) => console.error(`Error loading ${animationFile}: ${error}`),
      );
    } else if (["fbx"].includes(extension)) {
      this.fbxLoader.load(
        animationFile,
        (anim) => {
          const animation = anim.animations[0] as AnimationClip;
          const animationAction = this.animationMixer.clipAction(animation);
          this.animations.set(animationType, animationAction);
          if (animationType === AnimationState.idle) {
            animationAction.play();
          }
        },
        undefined,
        (error) => console.error(`Error loading ${animationFile}: ${error}`),
      );
    }
  }

  private transitionToAnimation(
    targetAnimation: AnimationState,
    transitionDuration: number = 0.21,
  ): void {
    if (this.currentAnimation === targetAnimation) return;

    const currentAction = this.animations.get(this.currentAnimation);
    const targetAction = this.animations.get(targetAnimation);

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

  private updateFromNetwork(clientUpdate: CharacterNetworkClientUpdate): void {
    if (!this.characterModel) return;
    const { position, rotation, state } = clientUpdate;
    this.characterModel.position.lerp(new Vector3(position.x, position.y, position.z), 0.2);
    const rotationQuaternion = new Quaternion(0, rotation.quaternionY, 0, rotation.quaternionW);
    this.characterModel.quaternion.slerp(rotationQuaternion, 0.2);
    if (state !== this.currentAnimation) {
      this.transitionToAnimation(state);
    }
  }
}
