import { ScenePosition } from "mml-web";
import { Euler, Group, PerspectiveCamera, Vector3 } from "three";

import { CameraManager } from "../camera/camera-manager";
import { CollisionsManager } from "../collisions/collisions-manager";
import { getSpawnPositionInsideCircle } from "../helpers/math-helpers";
import { InputManager } from "../input/input-manager";
import { Network } from "../network/network";
import { RunTimeManager } from "../runtime/runtime-manager";

import { Character, CharacterDescription } from "./character";
import { CharacterTransformProbe } from "./character-transform-probe";
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
  private collisionsManager: CollisionsManager;

  constructor(collisionsManager: CollisionsManager) {
    this.collisionsManager = collisionsManager;
  }

  spawnCharacter(
    characterDescription: CharacterDescription,
    id: number,
    group: Group,
    isLocal: boolean = false,
  ) {
    this.characterDescription = characterDescription;
    const characterLoadingPromise = new Promise<Character>((resolve) => {
      const character = new Character(
        characterDescription,
        id,
        isLocal,
        () => {
          const spawnPosition = getSpawnPositionInsideCircle(7, 30, id);
          character.model!.mesh!.position.set(spawnPosition.x, spawnPosition.y, spawnPosition.z);
          character.model!.hideMaterialByMeshName("SK_UE5Mannequin_1");
          group.add(character.model!.mesh!);

          if (isLocal) {
            this.character = character;
          } else {
            this.remoteCharacters.set(id, character);
            const remoteController = new RemoteController(character, id);
            remoteController.setAnimationFromFile(
              "idle",
              characterDescription.idleAnimationFileUrl,
            );
            remoteController.setAnimationFromFile("walk", characterDescription.jogAnimationFileUrl);
            remoteController.setAnimationFromFile(
              "run",
              characterDescription.sprintAnimationFileUrl,
            );
            this.remoteCharacterControllers.set(id, remoteController);
          }

          resolve(character);
        },
        this.collisionsManager,
      );
    });

    this.loadingCharacters.set(id, characterLoadingPromise);
    return characterLoadingPromise;
  }

  getLocalCharacterPositionAndRotation(): ScenePosition | null {
    if (this.character && this.character.model && this.character.model.mesh) {
      return {
        location: this.character.model.mesh.position,
        orientation: this.character.model.mesh.rotation,
      };
    }
    return null;
  }

  update(
    runTime: RunTimeManager,
    inputManager: InputManager,
    cameraManager: CameraManager,
    network: Network,
    group: Group,
  ) {
    if (this.character) {
      this.character.update(runTime.time);
      if (this.camera === null) this.camera = cameraManager.camera;
      if (this.transformProbe === null) {
        this.transformProbe = new CharacterTransformProbe();
      }
      cameraManager.setTarget(this.character.position.add(new Vector3(0, 1.3, 0)));

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
          characterController.update(update, runTime.time, runTime.smoothDeltaTime);
        }
      }

      for (const [id, character] of this.remoteCharacters) {
        if (!network.clientUpdates.has(id)) {
          group.remove(character.model!.mesh!);
          this.remoteCharacters.delete(id);
          this.remoteCharacterControllers.delete(id);
        }
      }

      if (runTime.frame % 60 === 0 && this.camera) {
        if (this.positionedFromUrl === false) {
          this.transformProbe.decodeCharacterAndCamera(this.character.model!.mesh!, cameraManager);
          this.positionedFromUrl = true;
        }
        this.transformProbe.encodeCharacterAndCamera(this.character.model!.mesh!, this.camera);
      }
    }
  }
}
