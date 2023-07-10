import { Vector3 } from "three";

export const getSpawnPositionAroundCircle = (
  radius: number,
  positions: number,
  id: number,
  yPos: number = 0,
): Vector3 => {
  const angleStep = (2 * Math.PI) / positions;
  const angle = id % 2 === 0 ? (id / 2) * angleStep : 2 * Math.PI - Math.floor(id / 2) * angleStep;
  const x = radius * Math.cos(angle - Math.PI / 2);
  const z = radius * Math.sin(angle - Math.PI / 2);
  return new Vector3(x, yPos, z);
};

export const getSpawnPositionInsideCircle = (
  radius: number,
  positions: number,
  id: number,
  yPos: number = 0,
): Vector3 => {
  if (id > 0) id += 3;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const theta = id * goldenAngle;
  const scale = id / positions;
  const scaledRadius = scale * radius;
  const x = Math.cos(theta) * scaledRadius;
  const z = Math.sin(theta) * scaledRadius;
  return new Vector3(x, yPos, z);
};

export const round = (n: number, digits: number): number => {
  return Number(n.toFixed(digits));
};

export const ease = (target: number, n: number, factor: number): number => {
  return round((target - n) * factor, 5);
};
