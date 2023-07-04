import {
  AnimationAction,
  AnimationMixer,
  Box3,
  BoxGeometry,
  Line3,
  LoopRepeat,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  Quaternion,
  Vector2,
  Vector3,
} from "three";

import { CameraManager } from "../camera/camera-manager";
import { CollisionsStore } from "../collisions/collisions-manager";
import { anyTruthness } from "../helpers/js-helpers";
import { ease } from "../helpers/math-helpers";
import { InputManager } from "../input/input-manager";
import { type AnimationState, type ClientUpdate } from "../network";
import { RunTimeManager } from "../runtime/runtime-manager";

import { ExtendedMesh } from "./character";

export type AnimationTypes = "idle" | "walk" | "run";

export class LocalController {
  public id: number = 0;
  public currentAnimation: string = "";

  public characterModel: Object3D | null = null;
  public characterCollider: ExtendedMesh | null = null;

  public animations: Record<string, AnimationAction>;
  public animationMixer: AnimationMixer;

  private characterOnGround: boolean = false;
  private characterVelocity: Vector3 = new Vector3();
  private gravity = -20;

  private upVector: Vector3 = new Vector3(0, 1, 0);

  private rotationOffset: number = 0;
  private azimuthalAngle: number = 0;

  private tempBox: Box3 = new Box3();
  private tempBoxHelper: Mesh<BoxGeometry, MeshBasicMaterial> | null = null;

  private tempMatrix: Matrix4 = new Matrix4();
  private tempSegment: Line3 = new Line3();
  private tempVector: Vector3 = new Vector3();
  private tempVector2: Vector3 = new Vector3();
  private lastIntersectedTriangleNormal: Vector3 = new Vector3();

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
    state: this.currentAnimation as AnimationState,
  };

  constructor(
    model: Object3D,
    collider: ExtendedMesh,
    animations: Record<string, AnimationAction>,
    animationMixer: AnimationMixer,
    id: number,
  ) {
    this.id = id;
    this.characterModel = model;
    this.characterCollider = collider;

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
    if (!this.thirdPersonCamera || !this.characterModel) return;
    this.azimuthalAngle = Math.atan2(
      this.thirdPersonCamera.position.x - this.characterModel.position.x,
      this.thirdPersonCamera.position.z - this.characterModel.position.z,
    );
  }

  updateRotation(): void {
    if (!this.thirdPersonCamera || !this.characterModel) return;
    this.updateRotationOffset();
    this.updateAzimuthalAngle();
    const rotationQuaternion = new Quaternion();
    rotationQuaternion.setFromAxisAngle(this.upVector, this.azimuthalAngle + this.rotationOffset);
    this.characterModel.quaternion.rotateTowards(rotationQuaternion, 0.07);
  }

  addScaledVectorToCharacter(deltaTime: number) {
    if (!this.characterModel || !this.characterCollider) return;
    this.characterModel.position.addScaledVector(this.tempVector, this.speed * deltaTime);
    this.characterCollider.position.addScaledVector(this.tempVector, this.speed * deltaTime);
  }

  updatePosition(deltaTime: number, _iter: number): void {
    if (!this.characterCollider || !CollisionsStore.mergedMesh || !this.characterModel) return;
    const { forward, backward, left, right } = this.inputDirections;
    const worldCollider = CollisionsStore.mergedMesh;

    this.targetSpeed = this.runInput ? 14 : 8;
    this.speed += ease(this.targetSpeed, this.speed, 0.07);

    if (this.characterOnGround) {
      this.characterVelocity.y = deltaTime * this.gravity;
    } else {
      this.characterVelocity.y += deltaTime * this.gravity;
    }

    this.characterModel?.position.addScaledVector(this.characterVelocity, deltaTime);
    this.characterCollider?.position.addScaledVector(this.characterVelocity, deltaTime);

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

    this.characterCollider.updateMatrixWorld();

    const capsuleInfo = this.characterCollider.capsuleInfo;

    this.tempBox.makeEmpty();
    this.tempMatrix.copy(worldCollider.matrixWorld).invert();

    this.tempSegment.copy(capsuleInfo.segment!);
    this.tempSegment.start
      .applyMatrix4(this.characterCollider.matrixWorld)
      .applyMatrix4(this.tempMatrix);
    this.tempSegment.end
      .applyMatrix4(this.characterCollider.matrixWorld)
      .applyMatrix4(this.tempMatrix);

    this.tempBox.expandByPoint(this.tempSegment.start);
    this.tempBox.expandByPoint(this.tempSegment.end);

    this.tempBox.min.subScalar(capsuleInfo.radius!);
    this.tempBox.max.addScalar(capsuleInfo.radius!);

    if (this.tempBoxHelper !== null) {
      this.characterModel.parent!.remove(this.tempBoxHelper);
      this.tempBoxHelper.geometry.dispose();
      this.tempBoxHelper.material.dispose();
      this.tempBoxHelper = null;
    }
    const tempBoxSize = this.tempBox.getSize(new Vector3());
    this.tempBoxHelper = new Mesh(
      new BoxGeometry(tempBoxSize.x, tempBoxSize.y, tempBoxSize.z),
      new MeshBasicMaterial({ color: 0xff0000, wireframe: true }),
    );
    this.tempBoxHelper.position.copy(this.tempBox.getCenter(new Vector3()));
    this.characterModel.parent!.add(this.tempBoxHelper);

    worldCollider.geometry.boundsTree!.shapecast({
      intersectsBounds: (box) => box.intersectsBox(this.tempBox),
      intersectsTriangle: (tri) => {
        const triPoint = this.tempVector;
        const capsulePoint = this.tempVector2;
        const distance = tri.closestPointToSegment(this.tempSegment, triPoint, capsulePoint);
        if (distance < capsuleInfo.radius! - distance) {
          const depth = capsuleInfo.radius! - distance;
          const direction = capsulePoint.sub(triPoint).normalize();
          this.tempSegment.start.addScaledVector(direction, depth);
          this.tempSegment.end.addScaledVector(direction, depth);

          tri.getNormal(this.lastIntersectedTriangleNormal);
        }
      },
    });

    const newPosition = this.tempVector;
    newPosition.copy(this.tempSegment.start).applyMatrix4(worldCollider.matrixWorld);

    const deltaVector = this.tempVector2;
    deltaVector.subVectors(newPosition, this.characterCollider.position);

    const offset = Math.max(0.0, deltaVector.length() - 1e-5);
    deltaVector.normalize().multiplyScalar(offset);

    this.characterModel.position.add(deltaVector);
    this.characterCollider.position.add(deltaVector);

    this.characterOnGround = deltaVector.y > Math.abs(deltaTime * this.characterVelocity.y * 0.25);

    const hit = worldCollider.geometry.boundsTree?.intersectsBox(this.tempBox, this.tempMatrix);
    if (!hit) this.lastIntersectedTriangleNormal = new Vector3();
    const dotProduct = this.lastIntersectedTriangleNormal.dot(this.upVector);
    if (hit && dotProduct === 1) {
      this.characterOnGround = true;
    }

    if (this.characterOnGround) {
      this.characterVelocity.set(0, 0, 0);
    } else {
      deltaVector.normalize();
      this.characterVelocity.addScaledVector(deltaVector, -deltaVector.dot(this.characterVelocity));
    }
  }

  updateNetworkState(): void {
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

  resetPosition(): void {
    if (!this.characterModel || !this.characterCollider) return;
    this.characterModel.position.y = 5;
    this.characterCollider.position.y = 5;
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

    if (anyTruthness(this.inputDirections)) this.updateRotation();

    for (let i = 0; i < 20; i++) {
      this.updatePosition(runTime.deltaTime / 20, i);
    }

    if (this.characterModel.position.y < -1) this.resetPosition();
    this.animationMixer.update(runTime.smoothDeltaTime);
    this.updateNetworkState();
  }
}
