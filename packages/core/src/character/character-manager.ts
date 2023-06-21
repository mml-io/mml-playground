import { Group, PerspectiveCamera } from "three";

import { CameraManager } from "../camera-manager";
import { Composer } from "../composer";
import { InputManager } from "../input-manager";
import { RunTime } from "../run-time-controller";
import { getSpawnPositionInsideCircle } from "../utils/helpers/math-helpers";
import { Network } from "../utils/network/network";

import { Character, CharacterDescription } from "./character";
import { CharacterTransformProbe } from "./character-transform-probe";
import { LocalController } from "./controller-local";
import { RemoteController } from "./controller-remote";

export class CharacterManager {
  public loadingCharacters: Map<number, Promise<Character>> = new Map();

  public remoteCharacters: Map<number, Character> = new Map();
  public remoteCharacterControllers: Map<number, RemoteController> = new Map();

  private characterDescription: CharacterDescription | null = null;
  public character: Character | null = null;
  public camera: PerspectiveCamera | null = null;

  private transformProbe: CharacterTransformProbe | null = null;
  private positionedFromUrl: boolean = false;

  spawnCharacter(
    characterDescription: CharacterDescription,
    id: number,
    group: Group,
    isLocal: boolean = false,
  ) {
    this.characterDescription = characterDescription;
    const characterLoadingPromise = new Promise<Character>((resolve) => {
      const character = new Character(characterDescription, id, isLocal, () => {
        const spawnPosition = getSpawnPositionInsideCircle(7, 30, id);
        character.model.position.set(spawnPosition.x, spawnPosition.y + 0.04, spawnPosition.z);

        character.hideMaterialByMeshName("SK_UE5Mannequin_1");
        group.add(character.model);

        if (isLocal) {
          this.character = character;
        } else {
          this.remoteCharacters.set(id, character);
          const remoteController = new RemoteController(character, id);
          remoteController.setAnimationFromFile("idle", characterDescription.idleAnimationFileUrl);
          remoteController.setAnimationFromFile("walk", characterDescription.jogAnimationFileUrl);
          remoteController.setAnimationFromFile("run", characterDescription.sprintAnimationFileUrl);
          this.remoteCharacterControllers.set(id, remoteController);
        }

        resolve(character);
      });
    });

    this.loadingCharacters.set(id, characterLoadingPromise);
    return characterLoadingPromise;
  }

  update(
    runTime: RunTime,
    inputManager: InputManager,
    cameraManager: CameraManager,
    composer: Composer,
    network: Network,
    group: Group,
  ) {
    if (this.character) {
      this.character.update(runTime, composer.resolution);
      if (this.camera === null) this.camera = cameraManager.camera;
      if (this.transformProbe === null) {
        this.transformProbe = new CharacterTransformProbe();
      }
      cameraManager.setTarget(this.character.headPosition);

      if (this.character.controller) {
        this.character.controller.update(inputManager, cameraManager, runTime);
      }

      if (network.connected && runTime.frame % 2 === 0) {
        network.sendUpdate(this.character.controller!.networkState);
      }

      for (const [id, update] of network.clientUpdates) {
        if (!this.remoteCharacters.has(id) && !this.loadingCharacters.has(id)) {
          this.spawnCharacter(this.characterDescription!, id, group).then(() => {
            this.loadingCharacters.delete(id);
          });
        }

        const characterController = this.remoteCharacterControllers.get(id);
        if (characterController) {
          characterController.update(update, runTime, composer.resolution);
        }
      }

      for (const [id, character] of this.remoteCharacters) {
        if (!network.clientUpdates.has(id)) {
          group.remove(character.model);
          this.remoteCharacters.delete(id);
          this.remoteCharacterControllers.delete(id);
        }
      }

      if (runTime.frame % 60 === 0 && this.camera) {
        if (this.positionedFromUrl === false) {
          this.transformProbe.decodeCharacterAndCamera(this.character.model, cameraManager);
          this.positionedFromUrl = true;
        }
        this.transformProbe.encodeCharacterAndCamera(this.character.model, this.camera);
      }
    }
  }
}
