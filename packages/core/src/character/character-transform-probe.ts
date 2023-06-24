import { Object3D, PerspectiveCamera } from "three";

import { CameraManager } from "../camera/camera-manager";

export class CharacterTransformProbe {
  encodeCharacterAndCamera = (character: Object3D, camera: PerspectiveCamera): void => {
    const state = {
      character: {
        position: character.position.toArray(),
        quaternion: character.quaternion.toArray(),
      },
      camera: {
        position: camera.position.toArray(),
        quaternion: camera.quaternion.toArray(),
      },
    };
    const hash = [
      ...state.character.position,
      ...state.character.quaternion,
      ...state.camera.position,
      ...state.camera.quaternion,
    ].join(",");
    window.location.hash = hash;
  };

  decodeCharacterAndCamera(character: Object3D, cameraManager: CameraManager) {
    const hash = window.location.hash.substring(1);
    if (hash) {
      const values = hash.split(",").map(Number);
      character.position.fromArray(values.slice(0, 3));
      character.quaternion.fromArray(values.slice(3, 7));
      cameraManager.camera.position.fromArray(values.slice(7, 10));
      cameraManager.camera.quaternion.fromArray(values.slice(10, 14));
    }
  }
}
