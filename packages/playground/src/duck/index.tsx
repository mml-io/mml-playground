import React from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

function Duck() {
  return (
    <m-model id="duck" src="/assets/duck.glb" sx="2" sy="2" sz="2">
      <m-attr-anim attr="ry" start="0" end="360" duration="4000"></m-attr-anim>
    </m-model>
  );
}

const container =
  document.getElementById("root") ?? document.body.appendChild(document.createElement("div"));
const root = createRoot(container);
flushSync(() => {
  root.render(<Duck />);
});
