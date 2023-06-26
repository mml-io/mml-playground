import { Clock } from "three";

export class RunTimeManager {
  private clock: Clock;
  private bufferSize: number = 30;
  private deltaTimeBuffer: number[] = [];

  public time: number;
  public deltaTime: number;
  public smoothDeltaTime: number;
  public frame: number = 0;

  constructor() {
    this.clock = new Clock();
    this.time = 0;
    this.deltaTime = 0;
    this.smoothDeltaTime = 0;
  }

  update() {
    this.deltaTime = this.clock.getDelta();
    this.time += this.deltaTime;
    this.deltaTimeBuffer.push(this.deltaTime);
    if (this.deltaTimeBuffer.length > this.bufferSize) this.deltaTimeBuffer.shift();
    this.smoothDeltaTime =
      this.deltaTimeBuffer.reduce((a, b) => a + b) / this.deltaTimeBuffer.length;
    this.frame++;
  }
}
