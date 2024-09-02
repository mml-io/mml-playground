// eslint-disable-next-line import/no-unresolved
import duck from "mml:../duck";
// eslint-disable-next-line import/default
import React from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

import {
  INTERACTIVE_SLOT_COUNT_X,
  INTERACTIVE_SLOT_COUNT_Z,
  SLOT_DEPTH,
  SLOT_WIDTH,
  SPACE_BETWEEN_SLOTS,
} from "../constants";
import {
  collisionEvents,
  dice,
  movingPlatform,
  positionProbe,
  videoPlayer,
  weather,
} from "../examples";
import { Slot } from "../Slot";

const DEMO_SLOTS = [
  {
    x: (SLOT_WIDTH + SPACE_BETWEEN_SLOTS) * -2,
    z: 0,
    documentUrl: collisionEvents,
    title: "Collision Events Demo",
  },
  {
    x: (SLOT_WIDTH + SPACE_BETWEEN_SLOTS) * -2,
    z: SPACE_BETWEEN_SLOTS + SLOT_DEPTH,
    documentUrl: positionProbe,
    title: "m-position-probe Demo",
  },
  {
    x: (SLOT_WIDTH + SPACE_BETWEEN_SLOTS) * -2,
    z: (SPACE_BETWEEN_SLOTS + SLOT_DEPTH) * 2,
    documentUrl: movingPlatform,
    title: "Moving Platform Demo",
  },
  {
    x: (SLOT_WIDTH + SPACE_BETWEEN_SLOTS) * -1,
    z: 0,
    documentUrl: duck,
    title: "Spinning Duck",
  },
  {
    x: (SLOT_WIDTH + SPACE_BETWEEN_SLOTS) * -1,
    z: SLOT_DEPTH + SPACE_BETWEEN_SLOTS,
    documentUrl: dice,
    title: "Interactive Dice",
  },
  {
    x: (SLOT_WIDTH + SPACE_BETWEEN_SLOTS) * -1,
    z: (SLOT_DEPTH + SPACE_BETWEEN_SLOTS) * 2,
    documentUrl: videoPlayer,
    title: "Video Player",
  },
  {
    x: (SLOT_WIDTH + SPACE_BETWEEN_SLOTS) * -1,
    z: (SLOT_DEPTH + SPACE_BETWEEN_SLOTS) * 3,
    documentUrl: weather,
    title: "Weather API",
  },
  {
    x: (SLOT_WIDTH + SPACE_BETWEEN_SLOTS) * -1,
    z: (SLOT_DEPTH + SPACE_BETWEEN_SLOTS) * 4,
    documentUrl: `/assets/static-mml.html`,
    title: "Static MML",
  },
];

function App() {
  const slotCoordinates: Array<[number, number]> = [];
  for (let x = 0; x < INTERACTIVE_SLOT_COUNT_X; x++) {
    for (let z = 0; z < INTERACTIVE_SLOT_COUNT_Z; z++) {
      if (!(x === 0 && z === 0)) {
        slotCoordinates.push([x, z]);
      }
    }
  }
  return (
    <>
      {DEMO_SLOTS.map((slot, index) => {
        return (
          <Slot
            key={"demo-" + index}
            x={slot.x}
            z={slot.z}
            demo={{ url: slot.documentUrl, title: slot.title }}
          />
        );
      })}
      {slotCoordinates.map(([x, z], index) => {
        return (
          <Slot
            key={index}
            x={(SLOT_WIDTH + SPACE_BETWEEN_SLOTS) * x}
            z={(SLOT_DEPTH + SPACE_BETWEEN_SLOTS) * z}
          />
        );
      })}
    </>
  );
}

const container =
  document.getElementById("root") ?? document.body.appendChild(document.createElement("div"));
const root = createRoot(container);
flushSync(() => {
  root.render(<App />);
});
