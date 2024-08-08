import { MMLClickEvent } from "@mml-io/mml-react-types";
import * as React from "react";
import { useEffect, useState } from "react";

import {
  DOCUMENT_LIFETIME_DURATION_S,
  SLOT_BORDER_THICKNESS,
  SLOT_DEPTH,
  SLOT_EMPTY_COLOR,
  SLOT_OCCUPIED_COLOR,
  SLOT_WIDTH,
} from "./constants";
import { DocumentLabel } from "./DocumentLabel";

type LoadedState = {
  url: string;
  title?: string;
  loadedTime: number;
  removable: boolean;
  userId: number;
};

export function Slot(props: { x: number; z: number; demo?: { url: string; title: string } }) {
  const now = Date.now();
  const [loadedState, setLoadedState] = useState<LoadedState | null>(
    props.demo
      ? {
          url: props.demo.url,
          title: props.demo.title,
          loadedTime: now,
          removable: false,
          userId: -1,
        }
      : null,
  );
  const [tickNumber, setTickNumber] = useState(0);

  useEffect(() => {
    const listener = (event: Event) => {
      const { connectionId } = (event as CustomEvent<{ connectionId: number }>).detail;
      if (loadedState && loadedState.userId === connectionId) {
        setLoadedState(null);
      }
    };
    window.addEventListener("disconnected", listener);
    return () => window.removeEventListener("disconnected", listener);
  }, [loadedState]);

  useEffect(() => {
    if (loadedState && loadedState.removable) {
      const interval = setInterval(() => {
        const documentLifetime = (now - loadedState.loadedTime) / 1000;
        const secondsRemaining = Math.ceil(DOCUMENT_LIFETIME_DURATION_S - documentLifetime);
        if (secondsRemaining <= 0) {
          setLoadedState(null);
          return;
        }
        setTickNumber(tickNumber + 1);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [loadedState, now, tickNumber]);

  let remainingTimeLabel = "";
  if (loadedState && loadedState.removable) {
    const documentLifetime = (now - loadedState.loadedTime) / 1000;
    const secondsRemaining = Math.ceil(DOCUMENT_LIFETIME_DURATION_S - documentLifetime);

    const labelMinutes = Math.floor(secondsRemaining / 60);
    const labelSeconds = secondsRemaining - labelMinutes * 60;
    remainingTimeLabel = `Document expires in ${
      labelMinutes > 0
        ? `${labelMinutes}:${labelSeconds.toString(10).padStart(2, "0")}`
        : `${labelSeconds}s`
    }`;
  }

  return (
    <m-cube
      x={props.x}
      z={props.z}
      width={SLOT_WIDTH - SLOT_BORDER_THICKNESS * 2}
      depth={SLOT_DEPTH - SLOT_BORDER_THICKNESS * 2}
      height="0.2"
      color={loadedState ? SLOT_OCCUPIED_COLOR : SLOT_EMPTY_COLOR}
    >
      {loadedState ? (
        <>
          <m-frame y="0.2" src={loadedState.url}></m-frame>
          <m-group
            visible-to={loadedState.removable ? loadedState.userId : ""}
            x={(SLOT_WIDTH - SLOT_BORDER_THICKNESS) / 2}
            z={(SLOT_DEPTH - SLOT_BORDER_THICKNESS) / 2}
            onClick={(event: MMLClickEvent) => {
              const { connectionId } = event.detail;
              if (loadedState && loadedState.removable && loadedState.userId === connectionId) {
                setLoadedState(null);
              }
            }}
          >
            <m-cube
              width={SLOT_BORDER_THICKNESS}
              depth={SLOT_BORDER_THICKNESS}
              height="0.5"
              color="#b91c1c"
            ></m-cube>

            <m-label
              content={`Remove
          document`}
              color="#f87171"
              font-size="18"
              alignment="left"
              width={SLOT_BORDER_THICKNESS}
              height="1"
              rx="-90"
              rz="90"
              y="0.26"
            ></m-label>
          </m-group>
        </>
      ) : (
        <>
          <m-prompt
            message="Enter document Web Socket URL"
            placeholder="wss://..."
            ref={(el: any) => {
              if (!el) {
                return;
              }
              el.addEventListener(
                "prompt",
                (event: CustomEvent<{ value: string; connectionId: number }>) => {
                  console.log("prompt", event.detail);
                  const { connectionId, value } = event.detail;
                  if (loadedState) {
                    return;
                  }

                  const trimmed = value.trim();
                  if (!trimmed) {
                    return;
                  }
                  setLoadedState({
                    url: trimmed,
                    loadedTime: Date.now(),
                    removable: true,
                    userId: connectionId,
                  });
                },
              );
            }}
          >
            <m-cube
              width={SLOT_WIDTH - SLOT_BORDER_THICKNESS * 2}
              depth={SLOT_DEPTH - SLOT_BORDER_THICKNESS * 2}
              height="0.21"
              color={SLOT_EMPTY_COLOR}
            ></m-cube>
          </m-prompt>
        </>
      )}
      <>
        {[
          {
            rz: 0,
            z: (SLOT_DEPTH - SLOT_BORDER_THICKNESS) / 2,
          },
          {
            rz: 90,
            x: (SLOT_WIDTH - SLOT_BORDER_THICKNESS) / 2,
          },
          {
            rz: 180,
            z: (SLOT_DEPTH - SLOT_BORDER_THICKNESS) / -2,
          },
          {
            rz: 270,
            x: (SLOT_WIDTH - SLOT_BORDER_THICKNESS) / -2,
          },
        ].map(({ rz, x, z }, index) => (
          <DocumentLabel
            key={index}
            label={
              props.demo
                ? props.demo.title
                : loadedState
                  ? remainingTimeLabel
                  : "Click slot to showcase your MML document"
            }
            rz={rz}
            x={x || 0}
            z={z || 0}
          />
        ))}
      </>
    </m-cube>
  );
}
