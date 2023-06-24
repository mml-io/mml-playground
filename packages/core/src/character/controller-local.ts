import {
  AnimationAction,
  AnimationMixer,
  LoopRepeat,
  Matrix4,
  Object3D,
  PerspectiveCamera,
  Quaternion,
  Vector2,
  Vector3,
} from "three";

import { CameraManager } from "../camera/camera-manager";
import { InputManager } from "../input/input-manager";
import { type AnimationState, type ClientUpdate } from "../network";
import { RunTimeManager } from "../runtime/runtime-manager";
import { anyTruthness } from "../utils/js-helpers";
import { ease } from "../utils/math-helpers";

export type AnimationTypes = "idle" | "walk" | "run";

export class LocalController {
  public id: number = 0;
  public currentAnimation: string = "";

  public characterModel: Object3D | null = null;
  public animations: Record<string, AnimationAction>;
  public animationMixer: AnimationMixer;

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
    location: new Vector3(),
    rotation: new Vector2(),
    state: this.currentAnimation as AnimationState,
  };

  constructor(
    model: Object3D,
    animations: Record<string, AnimationAction>,
    animationMixer: AnimationMixer,
    id: number,
  ) {
    this.id = id;
    this.characterModel = model;
    this.animations = animations;
    this.animationMixer = animationMixer;
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
    if (!this.characterModel) return;
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
    if (!this.thirdPersonCamera || !this.characterModel) return;
    const deltaTheta = Math.atan2(
      this.thirdPersonCamera.position.x - this.characterModel.position.x,
      this.thirdPersonCamera.position.z - this.characterModel.position.z,
    );
    const rotationQuaternion = new Quaternion();
    rotationQuaternion.setFromAxisAngle(this.rotationAngle, deltaTheta + this.getRotationOffset());

    this.currentRotationLerp += ease(this.targetRotationLerp, this.currentRotationLerp, 0.07);
    this.characterModel.quaternion.rotateTowards(rotationQuaternion, this.currentRotationLerp);
  }

  updatePosition(deltaTime: number): void {
    if (!this.thirdPersonCamera || !this.characterModel) return;
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
      this.characterModel.position.add(moveDirection);
    } else {
      this.velocity = Math.max(this.velocity - 0.01 * deltaTime, 0);
    }
  }

  getNetworkState(): void {
    const characterQuaternion = this.characterModel?.getWorldQuaternion(new Quaternion());
    const positionUpdate = new Vector3(
      this.characterModel?.position.x,
      this.characterModel?.position.y,
      this.characterModel?.position.z,
    );
    const rotationUpdate = new Vector2(characterQuaternion?.y, characterQuaternion?.w);
    this.networkState = {
      id: this.id,
      location: positionUpdate,
      rotation: rotationUpdate,
      state: this.currentAnimation as AnimationState,
    };
  }

  updateFromNetwork(clientUpdate: ClientUpdate): void {
    if (!this.characterModel || clientUpdate.id !== this.id) return;
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

  update(inputManager: InputManager, cameraManager: CameraManager, runTime: RunTimeManager): void {
    if (!this.characterModel || !this.animationMixer) return;
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
