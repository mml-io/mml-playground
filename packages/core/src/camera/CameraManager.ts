import { PerspectiveCamera, Vector3 } from "three";

import { ease } from "../helpers/math-helpers";

export class CameraManager {
  public readonly camera: PerspectiveCamera;
  private dragging: boolean = false;
  private target: Vector3 = new Vector3(0, 1.55, 0);
  private targetDistance: number;
  private maxTargetDistance: number = 20;
  private distance: number;
  private targetPhi: number | null = Math.PI / 2;
  private phi: number | null = Math.PI / 2;
  private targetTheta: number | null = -Math.PI / 2;
  private theta: number | null = -Math.PI / 2;
  private hadTarget: boolean = false;

  constructor() {
    this.camera = new PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.camera.position.set(0, 1.4, 3);

    this.targetDistance = 2.5;
    this.distance = this.targetDistance;

    document.addEventListener("mousedown", this.onMouseDown.bind(this));
    document.addEventListener("mouseup", this.onMouseUp.bind(this));
    document.addEventListener("mousemove", this.onMouseMove.bind(this));
    document.addEventListener("wheel", this.onMouseWheel.bind(this));
    window.addEventListener("resize", this.onResize.bind(this));
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private onMouseDown(_event: MouseEvent): void {
    this.dragging = true;
  }

  private onMouseUp(_event: MouseEvent): void {
    this.dragging = false;
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.dragging) {
      return;
    }
    if (this.targetTheta === null || this.targetPhi === null) {
      return;
    }
    this.targetTheta += event.movementX * 0.01;
    this.targetPhi -= event.movementY * 0.01;
    this.targetPhi = Math.max(Math.PI * 0.1, Math.min(Math.PI - Math.PI * 0.1, this.targetPhi));
    this.targetPhi = Math.min(Math.PI * 0.7, this.targetPhi);
  }

  private onMouseWheel(event: WheelEvent): void {
    const scrollAmount = event.deltaY * 0.01;
    this.targetDistance += scrollAmount;
    this.targetDistance = Math.max(0, this.targetDistance);
    this.targetDistance = Math.min(this.targetDistance, this.maxTargetDistance);
  }

  public setTarget(target: THREE.Vector3): void {
    this.target.copy(target);
    if (!this.hadTarget) {
      this.hadTarget = true;
      this.reverseUpdateFromPositions();
    }
  }

  private reverseUpdateFromPositions(): void {
    if (this.phi === null || this.theta == null) return;
    const dx = this.camera.position.x - this.target.x;
    const dy = this.camera.position.y - this.target.y;
    const dz = this.camera.position.z - this.target.z;
    this.targetDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    this.targetTheta = (this.theta + 2 * Math.PI) % (2 * Math.PI);
    this.targetPhi = Math.max(0, Math.min(Math.PI, this.phi));
    this.phi = this.targetPhi;
    this.theta = this.targetTheta;
    this.distance = this.targetDistance;
  }

  public update(): void {
    if (this.target === null) {
      return;
    }
    if (
      this.phi !== null &&
      this.targetPhi !== null &&
      this.theta !== null &&
      this.targetTheta !== null
    ) {
      this.distance += ease(this.targetDistance, this.distance, 0.02);
      this.distance = Math.min(this.distance, this.maxTargetDistance);
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
