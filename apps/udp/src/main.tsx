import React from "react";
import ReactDOM from "react-dom/client";
import { Boundary } from "@shared/Boundary";
import { TipLayer } from "@shared/TipLayer";
import App from "./App";
import "@shared/common.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Boundary>
      <App />
      <TipLayer />
    </Boundary>
  </React.StrictMode>,
);
