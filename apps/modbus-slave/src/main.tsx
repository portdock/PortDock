import React from "react";
import ReactDOM from "react-dom/client";
import { Boundary } from "@shared/Boundary";
import { TipLayer } from "@shared/TipLayer";
import { installErrorCapture } from "@shared/report";
import { installBrowserGuard } from "@shared/browserGuard";
import App from "./App";
import "@shared/common.css";

installErrorCapture();
// 배포판: 우클릭 브라우저 메뉴·F5·Ctrl+R·Ctrl+P·개발자 도구 키 막기
installBrowserGuard();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Boundary>
      <App />
      <TipLayer />
    </Boundary>
  </React.StrictMode>,
);
