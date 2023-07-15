import { Vector2, Vector3 } from "three";

import { AnimationState, ClientUpdate } from "./types";

class CharacterNetworkCodec {
  animationStateToByte(state: AnimationState) {
    switch (state) {
      case "idle":
        return 0;
      case "walk":
        return 1;
      case "run":
        return 2;
      case "jumpToAir":
        return 3;
      case "air":
        return 4;
      case "airToGround":
        return 5;
      default:
        return 0;
    }
  }

  byteToAnimationState(byte: number): AnimationState {
    switch (byte) {
      case 0:
        return "idle";
      case 1:
        return "walk";
      case 2:
        return "run";
      case 3:
        return "jumpToAir";
      case 4:
        return "air";
      case 5:
        return "airToGround";
      default:
        return "idle";
    }
  }

  encodeUpdate(update: ClientUpdate): Uint8Array {
    const buffer = new ArrayBuffer(19);
    const dataView = new DataView(buffer);
    dataView.setUint16(0, update.id); // id
    dataView.setFloat32(2, update.position.x); // position.x
    dataView.setFloat32(6, update.position.y); // position.y
    dataView.setFloat32(10, update.position.z); // position.z
    dataView.setInt16(14, update.rotation.x * 32767); // quaternion.y
    dataView.setInt16(16, update.rotation.y * 32767); // quaternion.w
    dataView.setUint8(18, this.animationStateToByte(update.state)); // animationState
    return new Uint8Array(buffer);
  }

  decodeUpdate(buffer: ArrayBuffer): ClientUpdate {
    const dataView = new DataView(buffer);
    const id = dataView.getUint16(0); // id
    const x = dataView.getFloat32(2); // position.x
    const y = dataView.getFloat32(6); // position.y
    const z = dataView.getFloat32(10); // position.z
    const quaternionY = dataView.getInt16(14) / 32767; // quaternion.y
    const quaternionW = dataView.getInt16(16) / 32767; // quaternion.w
    const state = this.byteToAnimationState(dataView.getUint8(18)); // animationState
    const position = new Vector3(x, y, z);
    const rotation = new Vector2(quaternionY, quaternionW);
    return { id, position, rotation, state };
  }
}

export { CharacterNetworkCodec };
