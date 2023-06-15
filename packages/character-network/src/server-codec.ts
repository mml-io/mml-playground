import { TextEncoder, TextDecoder } from "util";

import { Vector2 } from "three";

export type AnimationState = "idle" | "walking" | "running";

export type ClientUpdate = {
  id: number;
  location: Vector2;
  rotation: Vector2;
  state: AnimationState;
};

export class ServerCodec {
  nextId: number = 1;
  recycledIds: number[] = [];

  encoder: TextEncoder = new TextEncoder();
  decoder: TextDecoder = new TextDecoder();

  getId(): number {
    // if (this.recycledIds.length > 0) {
    //   return this.recycledIds.shift() as number;
    // } else {
    //   return this.nextId++;
    // }
    // /* TODO: temporary fix until we improve the ID recycling */
    return this.nextId++;
  }

  disposeId(id: number): void {
    this.recycledIds.push(id);
  }

  animationStateToByte(state: AnimationState) {
    switch (state) {
      case "idle":
        return 0;
      case "walking":
        return 1;
      case "running":
        return 2;
    }
  }

  byteToAnimationState(byte: number): AnimationState {
    switch (byte) {
      case 0:
        return "idle";
      case 1:
        return "walking";
      case 2:
        return "running";
      default:
        throw new Error("Invalid byte for animation state");
    }
  }

  encodeUpdate(update: ClientUpdate): Uint8Array {
    const buffer = new ArrayBuffer(15);
    const dataView = new DataView(buffer);
    dataView.setUint16(0, update.id); // id
    dataView.setFloat32(2, update.location.x); // position.x
    dataView.setFloat32(6, update.location.y); // position.z
    dataView.setInt16(10, update.rotation.x * 32767); // quaternion.y
    dataView.setInt16(12, update.rotation.y * 32767); // quaternion.w
    dataView.setUint8(14, this.animationStateToByte(update.state)); // animationState
    return new Uint8Array(buffer);
  }

  decodeUpdate(buffer: ArrayBuffer): ClientUpdate {
    const dataView = new DataView(buffer);
    const id = dataView.getUint16(0); // id
    const x = dataView.getFloat32(2); // position.x
    const z = dataView.getFloat32(6); // position.z
    const quaternionY = dataView.getInt16(10) / 32767; // quaternion.y
    const quaternionW = dataView.getInt16(12) / 32767; // quaternion.w
    const state = this.byteToAnimationState(dataView.getUint8(14)); // animationState
    const location = new Vector2(x, z);
    const rotation = new Vector2(quaternionY, quaternionW);
    return { id, location, rotation, state };
  }
}
