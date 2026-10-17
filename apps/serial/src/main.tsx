import React from "react";
import ReactDOM from "react-dom/client";
import { Boundary } from "@shared/Boundary";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Boundary>
      <App />
    </Boundary>
  </React.StrictMode>,
);
