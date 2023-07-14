import { Color, Vector3 } from "three";

import { CameraManager } from "../camera/CameraManager";
import { CollisionsManager } from "../collisions/CollisionsManager";
import { KeyInputManager } from "../input/KeyInputManager";
import { RunTimeManager } from "../runtime/RunTimeManager";

import { CharacterModel } from "./CharacterModel";
import { LocalController } from "./LocalController";

export type CharacterDescription = {
  meshFileUrl: string;
  idleAnimationFileUrl: string;
  jogAnimationFileUrl: string;
  sprintAnimationFileUrl: string;
  modelScale: number;
};

export class Character {
  public controller: LocalController | null = null;

  public name: string | null = null;
  public model: CharacterModel | null = null;
  public color: Color = new Color();

  public position: Vector3 = new Vector3();

  constructor(
    private readonly characterDescription: CharacterDescription,
    private readonly id: number,
    private readonly isLocal: boolean,
    private readonly modelLoadedCallback: () => void,
    private readonly collisionsManager: CollisionsManager,
    private readonly keyInputManager: KeyInputManager,
    private readonly cameraManager: CameraManager,
    private readonly runTimeManager: RunTimeManager,
  ) {
    this.load();
  }

  private async load(): Promise<void> {
    this.model = new CharacterModel(this.characterDescription);
    await this.model.init();
    this.color = this.model.material.colorsCube216[this.id];
    if (this.isLocal) {
      this.controller = new LocalController(
        this.model,
        this.id,
        this.collisionsManager,
        this.keyInputManager,
        this.cameraManager,
        this.runTimeManager,
      );
    }
    this.modelLoadedCallback();
  }

  public update(time: number) {
    if (!this.model) return;
    this.model.mesh!.getWorldPosition(this.position);
    if (typeof this.model.material.uniforms.time !== "undefined") {
      this.model.material.uniforms.time.value = time;
      this.model.material.uniforms.diffuseRandomColor.value = this.color;
    }
  }
}
