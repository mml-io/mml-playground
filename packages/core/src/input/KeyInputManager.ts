export class KeyInputManager {
  private keys = new Map<string, boolean>();

  constructor() {
    document.addEventListener("keydown", this.onKeyDown.bind(this));
    document.addEventListener("keyup", this.onKeyUp.bind(this));
    window.addEventListener("blur", this.handleUnfocus.bind(this));
  }

  private handleUnfocus(_event: FocusEvent): void {
    this.keys = new Map<string, boolean>();
  }

  private onKeyDown(event: KeyboardEvent): void {
    this.keys.set(event.key.toLowerCase(), true);
  }

  private onKeyUp(event: KeyboardEvent): void {
    this.keys.set(event.key.toLowerCase(), false);
  }

  public isKeyPressed(key: string): boolean {
    return this.keys.get(key) || false;
  }

  public isMovementKeyPressed(): boolean {
    return ["w", "a", "s", "d"].some((key) => this.isKeyPressed(key));
  }

  public isShiftPressed(): boolean {
    return this.isKeyPressed("shift");
  }

  public isJumping(): boolean {
    return this.isKeyPressed(" ");
  }

  public dispose() {
    document.removeEventListener("keydown", this.onKeyDown.bind(this));
    document.removeEventListener("keyup", this.onKeyDown.bind(this));
    window.removeEventListener("blur", this.handleUnfocus.bind(this));
  }
}
