import { Box3, Line3, Matrix4, PerspectiveCamera, Quaternion, Vector2, Vector3 } from "three";

import { CameraManager } from "../camera/camera-manager";
import { CollisionsManager } from "../collisions/collisions-manager";
import { anyTruthness } from "../helpers/js-helpers";
import { ease } from "../helpers/math-helpers";
import { InputManager } from "../input/input-manager";
import { type AnimationState, type ClientUpdate } from "../network";
import { RunTimeManager } from "../runtime/runtime-manager";

import { CharacterModel } from "./character-model";

export type AnimationTypes = "idle" | "walk" | "run";

export class LocalController {
  public id: number = 0;
  private model: CharacterModel | null = null;
  private collisionsManager: CollisionsManager;

  public capsuleInfo = {
    radius: 0.4,
    segment: new Line3(new Vector3(), new Vector3(0, 1.05, 0)),
  };

  private characterOnGround: boolean = false;
  private characterVelocity: Vector3 = new Vector3();
  private gravity = -20;

  private upVector: Vector3 = new Vector3(0, 1, 0);

  private rotationOffset: number = 0;
  private azimuthalAngle: number = 0;

  private tempBox: Box3 = new Box3();

  private tempMatrix: Matrix4 = new Matrix4();
  private tempSegment: Line3 = new Line3();
  private tempVector: Vector3 = new Vector3();
  private tempVector2: Vector3 = new Vector3();

  private jumpInput: boolean = false;
  private jumpForce: number = 10;
  private canJump: boolean = true;

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

  public networkState: ClientUpdate = {
    id: 0,
    location: new Vector3(),
    rotation: new Vector2(),
    state: "idle",
  };

  constructor(model: CharacterModel, id: number, collisionsManager: CollisionsManager) {
    this.id = id;
    this.model = model;
    this.collisionsManager = collisionsManager;
  }

  getTargetAnimation(): AnimationTypes {
    const { forward, backward, left, right } = this.inputDirections;
    const hasAnyDirection = forward || backward || left || right;
    const isRunning = this.runInput && hasAnyDirection;
    const conflictingDirections = (forward && backward) || (left && right);

    if (conflictingDirections) return "idle";
    return hasAnyDirection ? (isRunning ? "run" : "walk") : "idle";
  }

  updateRotationOffset(): void {
    const { forward, backward, left, right } = this.inputDirections;
    if ((left && right) || (forward && backward)) return;
    if (forward) {
      this.rotationOffset = Math.PI;
      if (left) this.rotationOffset = Math.PI + Math.PI / 4;
      if (right) this.rotationOffset = Math.PI - Math.PI / 4;
    } else if (backward) {
      this.rotationOffset = Math.PI * 2;
      if (left) this.rotationOffset = -Math.PI * 2 - Math.PI / 4;
      if (right) this.rotationOffset = Math.PI * 2 + Math.PI / 4;
    } else if (left) {
      this.rotationOffset = Math.PI * -0.5;
    } else if (right) {
      this.rotationOffset = Math.PI * 0.5;
    }
  }

  updateAzimuthalAngle(): void {
    if (!this.thirdPersonCamera || !this.model?.mesh) return;
    this.azimuthalAngle = Math.atan2(
      this.thirdPersonCamera.position.x - this.model.mesh.position.x,
      this.thirdPersonCamera.position.z - this.model.mesh.position.z,
    );
  }

  updateRotation(): void {
    if (!this.thirdPersonCamera || !this.model?.mesh) return;
    this.updateRotationOffset();
    this.updateAzimuthalAngle();
    const rotationQuaternion = new Quaternion();
    rotationQuaternion.setFromAxisAngle(this.upVector, this.azimuthalAngle + this.rotationOffset);
    this.model.mesh.quaternion.rotateTowards(rotationQuaternion, 0.07);
  }

  addScaledVectorToCharacter(deltaTime: number) {
    if (!this.model?.mesh) return;
    this.model.mesh.position.addScaledVector(this.tempVector, this.speed * deltaTime);
  }

  updatePosition(deltaTime: number, _iter: number): void {
    if (!this.model?.mesh) return;
    const { forward, backward, left, right } = this.inputDirections;

    this.targetSpeed = this.runInput ? 14 : 8;
    this.speed += ease(this.targetSpeed, this.speed, 0.07);

    if (this.characterOnGround) {
      this.canJump = true;
      if (this.jumpInput && this.canJump) {
        this.characterVelocity.y += this.jumpForce;
        this.canJump = false;
      } else {
        this.characterVelocity.y = deltaTime * this.gravity;
      }
    } else {
      this.characterVelocity.y += deltaTime * this.gravity;
      this.canJump = false;
    }

    this.model.mesh.position.addScaledVector(this.characterVelocity, deltaTime);

    if (forward) {
      this.tempVector.set(0, 0, -1).applyAxisAngle(this.upVector, this.azimuthalAngle);
      this.addScaledVectorToCharacter(deltaTime);
    }

    if (backward) {
      this.tempVector.set(0, 0, 1).applyAxisAngle(this.upVector, this.azimuthalAngle);
      this.addScaledVectorToCharacter(deltaTime);
    }

    if (left) {
      this.tempVector.set(-1, 0, 0).applyAxisAngle(this.upVector, this.azimuthalAngle);
      this.addScaledVectorToCharacter(deltaTime);
    }

    if (right) {
      this.tempVector.set(1, 0, 0).applyAxisAngle(this.upVector, this.azimuthalAngle);
      this.addScaledVectorToCharacter(deltaTime);
    }

    this.model.mesh.updateMatrixWorld();

    this.tempBox.makeEmpty();

    this.tempSegment.copy(this.capsuleInfo.segment!);
    this.tempSegment.start.applyMatrix4(this.model.mesh.matrixWorld).applyMatrix4(this.tempMatrix);
    this.tempSegment.end.applyMatrix4(this.model.mesh.matrixWorld).applyMatrix4(this.tempMatrix);

    this.tempBox.expandByPoint(this.tempSegment.start);
    this.tempBox.expandByPoint(this.tempSegment.end);

    this.tempBox.min.subScalar(this.capsuleInfo.radius!);
    this.tempBox.max.addScalar(this.capsuleInfo.radius!);

    this.collisionsManager.applyColliders(this.tempSegment, this.capsuleInfo.radius!, this.tempBox);

    const newPosition = this.tempVector;
    newPosition.copy(this.tempSegment.start);

    const deltaVector = this.tempVector2;
    deltaVector.subVectors(newPosition, this.model.mesh.position);

    const offset = Math.max(0.0, deltaVector.length() - 1e-5);
    deltaVector.normalize().multiplyScalar(offset);

    this.model.mesh.position.add(deltaVector);

    this.characterOnGround = deltaVector.y > Math.abs(deltaTime * this.characterVelocity.y * 0.25);

    if (this.characterOnGround) {
      this.characterVelocity.set(0, 0, 0);
    } else {
      deltaVector.normalize();
      this.characterVelocity.addScaledVector(deltaVector, -deltaVector.dot(this.characterVelocity));
    }
  }

  updateNetworkState(): void {
    if (!this.model?.mesh) return;
    const characterQuaternion = this.model.mesh.getWorldQuaternion(new Quaternion());
    const positionUpdate = new Vector3(
      this.model.mesh.position.x,
      this.model.mesh.position.y,
      this.model.mesh.position.z,
    );
    const rotationUpdate = new Vector2(characterQuaternion?.y, characterQuaternion?.w);
    this.networkState = {
      id: this.id,
      location: positionUpdate,
      rotation: rotationUpdate,
      state: this.model.currentAnimation as AnimationState,
    };
  }

  resetPosition(): void {
    if (!this.model?.mesh) return;
    this.model.mesh.position.y = 5;
  }

  update(inputManager: InputManager, cameraManager: CameraManager, runTime: RunTimeManager): void {
    if (!this.model?.mesh || !this.model?.animationMixer) return;
    if (!this.thirdPersonCamera) this.thirdPersonCamera = cameraManager.camera;

    const movementKeysPressed = inputManager.isMovementKeyPressed();
    const forward = inputManager.isKeyPressed("w");
    const backward = inputManager.isKeyPressed("s");
    const left = inputManager.isKeyPressed("a");
    const right = inputManager.isKeyPressed("d");

    this.jumpInput = inputManager.isJumping();

    this.inputDirections = { forward, backward, left, right };
    this.runInput = inputManager.isShiftPressed();

    if (movementKeysPressed) {
      const targetAnimation = this.getTargetAnimation();
      this.model.updateAnimation(targetAnimation, runTime.smoothDeltaTime);
    } else {
      this.model.updateAnimation("idle", runTime.smoothDeltaTime);
    }

    if (anyTruthness(this.inputDirections)) this.updateRotation();

    for (let i = 0; i < 15; i++) {
      this.updatePosition(runTime.smoothDeltaTime / 15, i);
    }

    if (this.model.mesh.position.y < 0) this.resetPosition();
    this.updateNetworkState();
  }
}
