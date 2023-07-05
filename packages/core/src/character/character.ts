import { Color, Vector3 } from "three";

import { CharacterModel } from "./character-model";
import { LocalController } from "./controller-local";

export type CharacterDescription = {
  meshFileUrl: string;
  idleAnimationFileUrl: string;
  jogAnimationFileUrl: string;
  sprintAnimationFileUrl: string;
  modelScale: number;
};

export type AnimationTypes = "idle" | "walk" | "run";

export class Character {
  public debug = false;
  private characterDescription: CharacterDescription;
  private modelLoadedCallback: () => void;

  public controller: LocalController | null = null;

  public id: number = 0;
  public isLocal: boolean;
  public name: string | null = null;
  public model: CharacterModel | null = null;
  public color: Color = new Color();

  public position: Vector3 = new Vector3();

  constructor(
    characterDescription: CharacterDescription,
    id: number,
    isLocal: boolean,
    modelLoadedCallback: () => void,
  ) {
    this.characterDescription = characterDescription;
    this.id = id;
    this.isLocal = isLocal;
    this.modelLoadedCallback = modelLoadedCallback;
    this.load();
  }

  async load(): Promise<void> {
    this.model = new CharacterModel(this.characterDescription);
    await this.model.init();
    this.color = this.model.material.colorsCube216[this.id];
    if (this.isLocal) {
      this.controller = new LocalController(this.model, this.id);
    }
    this.modelLoadedCallback();
  }

  update(time: number) {
    if (!this.model) return;
    this.position = this.model.mesh!.getWorldPosition(new Vector3());
    if (typeof this.model.material.uniforms.time !== "undefined") {
      this.model.material.uniforms.time.value = time;
      this.model.material.uniforms.diffuseRandomColor.value = this.color;
    }
  }
}
