import React from "react";
import ReactDOM from "react-dom/client";
import { Boundary } from "@shared/Boundary";
import { TipLayer } from "@shared/TipLayer";
import { installErrorCapture } from "@shared/report";
import App from "./App";
import "@shared/common.css";

installErrorCapture();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Boundary>
      <App />
      <TipLayer />
    </Boundary>
  </React.StrictMode>,
);
