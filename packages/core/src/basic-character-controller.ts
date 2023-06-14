import {
  AnimationAction,
  AnimationClip,
  AnimationMixer,
  LoadingManager,
  LoopRepeat,
  Matrix4,
  Object3D,
  PerspectiveCamera,
  Quaternion,
  Vector2,
  Vector3,
} from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { CameraManager } from "./camera-manager";
import { InputManager } from "./input-manager";
import { RunTime } from "./run-time-controller";
import { anyTruthness } from "./utils/helpers/js-helpers";
import { ease } from "./utils/helpers/math-helpers";
import { type AnimationState, type ClientUpdate } from "./utils/network/network";

export type AnimationTypes = "idle" | "walk" | "run";

export class BasicCharacterController {
  public id: number = 0;
  public currentAnimation: string = "idle";

  public character: Object3D | null = null;

  private animationMixer: AnimationMixer = new AnimationMixer(new Object3D());
  private animations: Record<string, AnimationAction> = {};
  private loadManager: LoadingManager = new LoadingManager();

  private fbxLoader: FBXLoader = new FBXLoader(this.loadManager);
  private gltfLoader: GLTFLoader = new GLTFLoader(this.loadManager);

  private inputDirections: {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
  } = {
    forward: false,
    backward: false,
    left: false,
    right: false,
  };
  private runInput: boolean = false;

  private thirdPersonCamera: PerspectiveCamera | null = null;

  private speed: number = 0;
  private targetSpeed: number = 0;
  private velocity: number = 0;

  private rotationAngle: Vector3 = new Vector3(0, 1, 0);
  private rotationOffset: number = 0;
  private currentRotationLerp: number = 0.05;
  private targetRotationLerp: number = 0.05;

  public networkState: ClientUpdate = {
    id: 0,
    location: new Vector2(),
    rotation: new Vector2(),
    state: this.currentAnimation as AnimationState,
  };

  constructor(characterModel: Object3D, id: number) {
    this.id = id;
    this.character = characterModel;
    this.animationMixer = new AnimationMixer(this.character);
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
    } else if (["gltf", "glb"].includes(extension)) {
      this.fbxLoader.load(animationFile, (anim) => {
        const animation = anim.animations[0] as AnimationClip;
        this.animations[animationType] = this.animationMixer.clipAction(animation);
        if (animationType === "idle") this.animations[animationType].play();
      });
    }
  }

  getTargetAnimation(): AnimationTypes {
    const { forward, backward, left, right } = this.inputDirections;
    const hasAnyDirection = forward || backward || left || right;
    const isRunning = this.runInput && hasAnyDirection;
    const conflictingDirections = (forward && backward) || (left && right);

    if (conflictingDirections) return "idle";
    return hasAnyDirection ? (isRunning ? "run" : "walk") : "idle";
  }

  transitionToAnimation(targetAnimation: string, transitionDuration: number = 0.21): void {
    if (this.currentAnimation === targetAnimation) return;

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

  getRotationOffset(): number {
    let rotationOffset = 0;
    const { forward, backward, left, right } = this.inputDirections;
    const conflictingDirections = (left && right) || (forward && backward);
    if (conflictingDirections) return this.rotationOffset;
    if (forward) {
      rotationOffset = Math.PI;
      if (left) rotationOffset += Math.PI / 4;
      if (right) rotationOffset -= Math.PI / 4;
    } else if (backward) {
      rotationOffset = Math.PI * 2;
      if (left) rotationOffset = -Math.PI * 2 - Math.PI / 4;
      if (right) rotationOffset = Math.PI * 2 + Math.PI / 4;
    } else if (left) {
      rotationOffset = Math.PI * -0.5;
    } else if (right) {
      rotationOffset = Math.PI * 0.5;
    }
    if (rotationOffset !== this.rotationOffset) {
      let diff = rotationOffset - this.rotationOffset;
      diff = ((diff % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      this.targetRotationLerp = diff === Math.PI ? 0.2 : 0.08;
      this.rotationOffset = rotationOffset;
    }
    return this.rotationOffset;
  }

  updateRotation(): void {
    if (!this.thirdPersonCamera || !this.character) return;
    const deltaTheta = Math.atan2(
      this.thirdPersonCamera.position.x - this.character.position.x,
      this.thirdPersonCamera.position.z - this.character.position.z,
    );
    const rotationQuaternion = new Quaternion();
    rotationQuaternion.setFromAxisAngle(this.rotationAngle, deltaTheta + this.getRotationOffset());

    this.currentRotationLerp += ease(this.targetRotationLerp, this.currentRotationLerp, 0.07);
    this.character.quaternion.rotateTowards(rotationQuaternion, this.currentRotationLerp);
  }

  updatePosition(deltaTime: number): void {
    if (!this.thirdPersonCamera || !this.character) return;
    const { forward, backward, left, right } = this.inputDirections;

    this.targetSpeed = this.runInput ? 14 : 8;
    this.speed += ease(this.targetSpeed, this.speed, 0.07);

    const moveDirection = new Vector3(0, 0, 0);
    if (forward) moveDirection.z -= 1;
    if (backward) moveDirection.z += 1;
    if (left) moveDirection.x -= 1;
    if (right) moveDirection.x += 1;

    if (moveDirection.length() > 0) {
      this.velocity = Math.min(this.velocity + this.speed, this.speed);

      moveDirection.normalize();

      const cameraDirectionXZ = new Vector3();
      this.thirdPersonCamera.getWorldDirection(cameraDirectionXZ);
      cameraDirectionXZ.y = 0;
      cameraDirectionXZ.normalize();

      const rotationMatrix = new Matrix4().lookAt(
        new Vector3(0, 0, 0),
        cameraDirectionXZ,
        new Vector3(0, 1, 0),
      );
      moveDirection.applyMatrix4(rotationMatrix);

      moveDirection.y = 0;
      moveDirection.multiplyScalar(this.velocity * deltaTime);
      this.character.position.add(moveDirection);
    } else {
      this.velocity = Math.max(this.velocity - 0.01 * deltaTime, 0);
    }
  }

  getNetworkState(): void {
    const characterQuaternion = this.character?.getWorldQuaternion(new Quaternion());
    const positionUpdate = new Vector2(this.character?.position.x, this.character?.position.z);
    const rotationUpdate = new Vector2(characterQuaternion?.y, characterQuaternion?.w);
    this.networkState = {
      id: this.id,
      location: positionUpdate,
      rotation: rotationUpdate,
      state: this.currentAnimation as AnimationState,
    };
  }

  updateFromNetwork(clientUpdate: ClientUpdate): void {
    if (!this.character || clientUpdate.id !== this.id) return;
    const { location, rotation, state } = clientUpdate;
    this.character.position.x = location.x;
    this.character.position.z = location.y;
    const rotationQuaternion = new Quaternion(0, rotation.x, 0, rotation.y);
    this.character.setRotationFromQuaternion(rotationQuaternion);
    if (state !== this.currentAnimation) {
      this.transitionToAnimation(state);
    }
  }

  update(inputManager: InputManager, cameraManager: CameraManager, runTime: RunTime): void {
    if (!this.character) return;
    if (!this.thirdPersonCamera) this.thirdPersonCamera = cameraManager.camera;

    const movementKeysPressed = inputManager.isMovementKeyPressed();
    const forward = inputManager.isKeyPressed("w");
    const backward = inputManager.isKeyPressed("s");
    const left = inputManager.isKeyPressed("a");
    const right = inputManager.isKeyPressed("d");
    this.inputDirections = { forward, backward, left, right };
    this.runInput = inputManager.isShiftPressed();

    if (movementKeysPressed) {
      const targetAnimation = this.getTargetAnimation();
      if (targetAnimation !== this.currentAnimation) {
        this.transitionToAnimation(targetAnimation);
      }
    } else {
      if (this.animations.idle) this.transitionToAnimation("idle");
    }
    this.updatePosition(runTime.smoothDeltaTime);
    if (anyTruthness(this.inputDirections)) this.updateRotation();
    this.animationMixer.update(runTime.smoothDeltaTime);
    this.getNetworkState();
  }
}
