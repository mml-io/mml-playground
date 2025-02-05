import * as React from "react";

import {
  SLOT_BORDER_THICKNESS,
  SLOT_DEPTH,
  SLOT_LABEL_COLOR,
  SLOT_LABEL_TEXT_COLOR,
} from "./constants";

export function DocumentLabel(props: { label: string; rz: number; x: number; z: number }) {
  return (
    <m-label
      content={props.label}
      color={SLOT_LABEL_COLOR}
      font-color={SLOT_LABEL_TEXT_COLOR}
      alignment="center"
      width={SLOT_DEPTH}
      height={SLOT_BORDER_THICKNESS}
      rx="-90"
      y="0.05"
      rz={props.rz}
      z={props.z || 0}
      x={props.x || 0}
    />
  );
}
