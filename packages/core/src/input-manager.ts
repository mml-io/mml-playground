import { Vector2 } from "three";

export class InputManager {
  keys: Map<string, boolean>;

  mouseCaptured: boolean = false;

  mouse: Vector2 = new Vector2();
  mouseMovement: Vector2 = new Vector2();
  mouseDelta: Vector2 = new Vector2();
  mouseWheelDeltaY: number = 0;

  constructor() {
    this.keys = new Map<string, boolean>();
    document.addEventListener("mousedown", this.onMouseDown.bind(this));
    document.addEventListener("pointerlockchange", this.onPointerLockChange.bind(this));
    document.addEventListener("pointerlockerror", this.onPointerLockError.bind(this));

    document.addEventListener("mousemove", this.onMouseMove.bind(this));
    document.addEventListener("wheel", this.onMouseWheel.bind(this));

    document.addEventListener("keydown", this.onKeyDown.bind(this));
    document.addEventListener("keyup", this.onKeyUp.bind(this));
  }

  onMouseDown(_event: MouseEvent): void {}

  onPointerLockChange(): void {
    this.mouseCaptured = document.pointerLockElement === document.body;
  }

  onPointerLockError(): void {
    () => {};
  }

  onMouseMove(event: MouseEvent): void {
    this.mouseMovement = new Vector2(event.movementX, event.movementY);
    this.mouseDelta = new Vector2(event.clientX - this.mouse.x, event.clientY - this.mouse.y);
    this.mouse = new Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1,
    );
  }

  onMouseWheel(event: WheelEvent): void {
    this.mouseWheelDeltaY = event.deltaY * 0.01;
  }

  onKeyDown(event: KeyboardEvent): void {
    this.keys.set(event.key.toLowerCase(), true);
  }

  onKeyUp(event: KeyboardEvent): void {
    this.keys.set(event.key.toLowerCase(), false);
  }

  isKeyPressed(key: string): boolean {
    return this.keys.get(key) || false;
  }

  isMovementKeyPressed(): boolean {
    return ["w", "a", "s", "d"].some((key) => this.isKeyPressed(key));
  }

  isShiftPressed(): boolean {
    return this.isKeyPressed("shift");
  }

  dispose() {
    document.removeEventListener("mousemove", this.onMouseMove.bind(this));
    document.removeEventListener("keydown", this.onKeyDown.bind(this));
    document.removeEventListener("keyup", this.onKeyDown.bind(this));
  }
}
