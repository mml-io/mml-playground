export enum AnimationState {
  "idle" = 0,
  "walking" = 1,
  "running" = 2,
  "jumpToAir" = 3,
  "air" = 4,
  "airToGround" = 5,
}

export type CharacterNetworkClientUpdate = {
  id: number;
  position: { x: number; y: number; z: number };
  rotation: { quaternionY: number; quaternionW: number };
  state: AnimationState;
};

export class CharacterNetworkCodec {
  static animationStateToByte(state: AnimationState): number {
    switch (state) {
      case AnimationState.idle:
        return 0;
      case AnimationState.walking:
        return 1;
      case AnimationState.running:
        return 2;
      case AnimationState.jumpToAir:
        return 3;
      case AnimationState.air:
        return 4;
      case AnimationState.airToGround:
        return 5;
      default:
        throw new Error("Invalid animation state");
    }
  }

  static byteToAnimationState(byte: number): AnimationState {
    switch (byte) {
      case 0:
        return AnimationState.idle;
      case 1:
        return AnimationState.walking;
      case 2:
        return AnimationState.running;
      case 3:
        return AnimationState.jumpToAir;
      case 4:
        return AnimationState.air;
      case 5:
        return AnimationState.airToGround;
      default:
        throw new Error("Invalid byte for animation state");
    }
  }

  static encodeUpdate(update: CharacterNetworkClientUpdate): Uint8Array {
    const buffer = new ArrayBuffer(19);
    const dataView = new DataView(buffer);
    dataView.setUint16(0, update.id); // id
    dataView.setFloat32(2, update.position.x); // position.x
    dataView.setFloat32(6, update.position.y); // position.y
    dataView.setFloat32(10, update.position.z); // position.z
    dataView.setInt16(14, update.rotation.quaternionY * 32767); // quaternion.y
    dataView.setInt16(16, update.rotation.quaternionW * 32767); // quaternion.w
    dataView.setUint8(18, CharacterNetworkCodec.animationStateToByte(update.state)); // animationState
    return new Uint8Array(buffer);
  }

  static decodeUpdate(buffer: ArrayBuffer): CharacterNetworkClientUpdate {
    const dataView = new DataView(buffer);
    const id = dataView.getUint16(0); // id
    const x = dataView.getFloat32(2); // position.x
    const y = dataView.getFloat32(6); // position.y
    const z = dataView.getFloat32(10); // position.z
    const quaternionY = dataView.getInt16(14) / 32767; // quaternion.y
    const quaternionW = dataView.getInt16(16) / 32767; // quaternion.w
    const state = CharacterNetworkCodec.byteToAnimationState(dataView.getUint8(18)); // animationState
    const position = { x, y, z };
    const rotation = { quaternionY, quaternionW };
    return { id, position, rotation, state };
  }
}
