import {
  CubeCamera,
  HalfFloatType,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLCubeRenderTarget,
  WebGLRenderer,
} from "three";

import { ease } from "../helpers/math-helpers";

export class CameraManager {
  camera: PerspectiveCamera;
  target: Vector3 = new Vector3(0, 1.55, 0);
  targetDistance: number;
  maxTargetDistance: number = 20;
  distance: number;
  targetPhi: number | null = null;
  phi: number | null = null;
  targetTheta: number | null = null;
  theta: number | null = null;

  cubeRenderTarget: WebGLCubeRenderTarget = new WebGLCubeRenderTarget(256);
  cubeCamera: CubeCamera = new CubeCamera(1, 100, this.cubeRenderTarget);

  mouseCaptured: boolean = false;
  dragging: boolean = false;
  firstMouseInteraction: boolean = false;

  constructor() {
    this.camera = new PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.camera.position.set(0, 1.4, 3);

    this.cubeRenderTarget.texture.type = HalfFloatType;

    this.targetDistance = 2.5;
    this.distance = this.targetDistance;

    document.addEventListener("mousedown", this.onMouseDown.bind(this));
    document.addEventListener("mouseup", this.onMouseUp.bind(this));
    document.addEventListener("mousemove", this.onMouseMove.bind(this));
    document.addEventListener("wheel", this.onMouseWheel.bind(this));
    document.addEventListener("pointerlockchange", this.onPointerLockChange.bind(this));
    document.addEventListener("pointerlockerror", this.onPointerLockError.bind(this));
  }

  onMouseDown(_event: MouseEvent): void {
    if (this.dragging === false) this.dragging = true;
    if (this.phi === null || this.theta === null) {
      this.phi = this.targetPhi = Math.PI / 2;
      this.theta = this.targetTheta = Math.PI / 2;
      this.reverseUpdateFromPositions();
      this.firstMouseInteraction = true;
    }
  }

  onMouseUp(_event: MouseEvent): void {
    if (this.dragging === true) this.dragging = false;
  }

  onMouseMove(event: MouseEvent): void {
    if (this.dragging === false) return;
    if (this.targetTheta === null || this.targetPhi === null) return;
    this.targetTheta += event.movementX * 0.01;
    this.targetPhi -= event.movementY * 0.01;
    this.targetPhi = Math.max(Math.PI * 0.1, Math.min(Math.PI - Math.PI * 0.1, this.targetPhi));
    this.targetPhi = Math.min(Math.PI * 0.7, this.targetPhi);
  }

  onMouseWheel(event: WheelEvent): void {
    const scrollAmount = event.deltaY * 0.01;
    this.targetDistance += scrollAmount;
    this.targetDistance = Math.max(0, this.targetDistance);
    this.targetDistance = Math.min(this.targetDistance, this.maxTargetDistance);
  }

  onPointerLockChange(): void {
    this.mouseCaptured = document.pointerLockElement === document.body;
  }

  onPointerLockError(): void {
    () => {};
  }

  setTarget(target: THREE.Vector3): void {
    this.target.copy(target);
  }

  updateEnv(cubeCamPosition: Vector3, scene: Scene, renderer: WebGLRenderer) {
    this.cubeCamera.position.set(cubeCamPosition.x, cubeCamPosition.y + 3, cubeCamPosition.z);
    this.cubeCamera.update(renderer, scene);
  }

  reverseUpdateFromPositions(): void {
    if (this.phi === null || this.theta == null) return;
    const dx = this.camera.position.x - this.target.x;
    const dy = this.camera.position.y - this.target.y;
    const dz = this.camera.position.z - this.target.z;
    this.targetDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    this.targetTheta = Math.atan2(dx, dz);
    this.targetPhi = Math.acos(dy / this.distance);
    this.targetTheta = (this.theta + 2 * Math.PI) % (2 * Math.PI);
    this.targetPhi = Math.max(0, Math.min(Math.PI, this.phi));
    this.phi = this.targetPhi;
    this.theta = this.targetTheta;
    this.distance = this.targetDistance;
  }

  update(): void {
    if (this.target === null) return;
    if (this.firstMouseInteraction === false) return;
    if (
      this.phi !== null &&
      this.targetPhi !== null &&
      this.theta !== null &&
      this.targetTheta !== null
    ) {
      this.distance += ease(this.targetDistance, this.distance, 0.02);
      this.phi += ease(this.targetPhi, this.phi, 0.07);
      this.theta += ease(this.targetTheta, this.theta, 0.07);

      const x = this.target.x + this.distance * Math.sin(this.phi) * Math.cos(this.theta);
      const y = this.target.y + this.distance * Math.cos(this.phi);
      const z = this.target.z + this.distance * Math.sin(this.phi) * Math.sin(this.theta);

      this.camera.position.set(x, y, z);
      this.camera.lookAt(this.target);
    }
  }
}
