import { AnimationState, CharacterNetworkClient } from "@mml-playground/character-network";
import { PositionAndRotation } from "mml-web";
import { Camera, Group, Object3D, PerspectiveCamera, Vector3 } from "three";

import { CameraManager } from "../camera/CameraManager";
import { CollisionsManager } from "../collisions/CollisionsManager";
import { getSpawnPositionInsideCircle } from "../helpers/math-helpers";
import { KeyInputManager } from "../input/KeyInputManager";
import { RunTimeManager } from "../runtime/RunTimeManager";

import { Character, CharacterDescription } from "./Character";
import { RemoteController } from "./RemoteController";

function encodeCharacterAndCamera(character: Object3D, camera: PerspectiveCamera): string {
  return [
    ...character.position.toArray(),
    ...character.quaternion.toArray(),
    ...camera.position.toArray(),
    ...camera.quaternion.toArray(),
  ].join(",");
}

function decodeCharacterAndCamera(hash: string, character: Object3D, camera: Camera) {
  const values = hash.split(",").map(Number);
  character.position.fromArray(values.slice(0, 3));
  character.quaternion.fromArray(values.slice(3, 7));
  camera.position.fromArray(values.slice(7, 10));
  camera.quaternion.fromArray(values.slice(10, 14));
}

export class CharacterManager {
  /*
   TODO - re-enable updating location hash when there is a solution that waits for models to load (currently if the 
    character was standing on a model and the page is reloaded the character falls into the model before it loads and 
    can be trapped).
  */
  private updateLocationHash = false;

  public loadingCharacters: Map<number, Promise<Character>> = new Map();

  public remoteCharacters: Map<number, Character> = new Map();
  public remoteCharacterControllers: Map<number, RemoteController> = new Map();

  private characterDescription: CharacterDescription | null = null;
  public character: Character | null = null;

  public readonly group: Group;

  constructor(
    private readonly collisionsManager: CollisionsManager,
    private readonly cameraManager: CameraManager,
    private readonly runTimeManager: RunTimeManager,
    private readonly inputManager: KeyInputManager,
    private readonly characterNetworkClient: CharacterNetworkClient,
  ) {
    this.group = new Group();
  }

  public spawnCharacter(
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
          if (window.location.hash && window.location.hash.length > 1) {
            decodeCharacterAndCamera(
              window.location.hash.substring(1),
              character.model!.mesh!,
              this.cameraManager.camera,
            );
          } else {
            const spawnPosition = getSpawnPositionInsideCircle(3, 30, id);
            character.model!.mesh!.position.set(spawnPosition.x, spawnPosition.y, spawnPosition.z);
            this.cameraManager.camera.position.set(
              spawnPosition.x,
              spawnPosition.y + 1.5,
              spawnPosition.z + 3,
            );
          }
          character.model!.hideMaterialByMeshName("SK_UE5Mannequin_1");
          group.add(character.model!.mesh!);

          if (isLocal) {
            this.character = character;
          } else {
            this.remoteCharacters.set(id, character);
            const remoteController = new RemoteController(character, id);
            remoteController.setAnimationFromFile(
              AnimationState.idle,
              characterDescription.idleAnimationFileUrl,
            );
            remoteController.setAnimationFromFile(
              AnimationState.walking,
              characterDescription.jogAnimationFileUrl,
            );
            remoteController.setAnimationFromFile(
              AnimationState.running,
              characterDescription.sprintAnimationFileUrl,
            );
            this.remoteCharacterControllers.set(id, remoteController);
          }

          resolve(character);
        },
        this.collisionsManager,
        this.inputManager,
        this.cameraManager,
        this.runTimeManager,
      );
    });

    this.loadingCharacters.set(id, characterLoadingPromise);
    return characterLoadingPromise;
  }

  public getLocalCharacterPositionAndRotation(): PositionAndRotation {
    if (this.character && this.character.model && this.character.model.mesh) {
      return {
        position: this.character.model.mesh.position,
        rotation: this.character.model.mesh.rotation,
      };
    }
    return {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
    };
  }

  public update() {
    if (this.character) {
      this.character.update(this.runTimeManager.time);
      this.cameraManager.setTarget(this.character.position.add(new Vector3(0, 1.3, 0)));

      if (this.character.controller) {
        this.character.controller.update();
      }
      if (this.characterNetworkClient.connected && this.runTimeManager.frame % 2 === 0) {
        this.characterNetworkClient.sendUpdate(this.character.controller!.networkState);
      }

      for (const [id, update] of this.characterNetworkClient.clientUpdates) {
        if (!this.remoteCharacters.has(id) && !this.loadingCharacters.has(id)) {
          this.spawnCharacter(this.characterDescription!, id, this.group).then(() => {
            this.loadingCharacters.delete(id);
          });
        }

        const characterController = this.remoteCharacterControllers.get(id);
        if (characterController) {
          characterController.update(
            update,
            this.runTimeManager.time,
            this.runTimeManager.deltaTime,
          );
        }
      }

      for (const [id, character] of this.remoteCharacters) {
        if (!this.characterNetworkClient.clientUpdates.has(id)) {
          this.group.remove(character.model!.mesh!);
          this.remoteCharacters.delete(id);
          this.remoteCharacterControllers.delete(id);
        }
      }

      if (this.updateLocationHash && this.runTimeManager.frame % 60 === 0) {
        window.location.hash = encodeCharacterAndCamera(
          this.character.model!.mesh!,
          this.cameraManager.camera,
        );
      }
    }
  }
}
