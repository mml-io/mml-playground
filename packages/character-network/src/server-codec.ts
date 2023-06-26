import { TextEncoder, TextDecoder } from "util";

import { Vector2, Vector3 } from "three";

export type AnimationState = "idle" | "walking" | "running";

export type ClientUpdate = {
  id: number;
  location: Vector3;
  rotation: Vector2;
  state: AnimationState;
};

export class ServerCodec {
  nextId: number = 1;
  recycledIds: number[] = [];

  encoder: TextEncoder = new TextEncoder();
  decoder: TextDecoder = new TextDecoder();

  getId(): number {
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
    const buffer = new ArrayBuffer(19);
    const dataView = new DataView(buffer);
    dataView.setUint16(0, update.id); // id
    dataView.setFloat32(2, update.location.x); // position.x
    dataView.setFloat32(6, update.location.y); // position.y
    dataView.setFloat32(10, update.location.z); // position.z
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
    const location = new Vector3(x, y, z);
    const rotation = new Vector2(quaternionY, quaternionW);
    return { id, location, rotation, state };
  }
}
