import { Vector2, Vector3 } from "three";
import { type WebSocket } from "ws";

export type AnimationState = "idle" | "walk" | "run" | "jumpToAir" | "air" | "airToGround";

export type Client = {
  socket: WebSocket;
  update: ClientUpdate;
};

export type ClientUpdate = {
  id: number;
  position: Vector3;
  rotation: Vector2;
  state: AnimationState;
};
