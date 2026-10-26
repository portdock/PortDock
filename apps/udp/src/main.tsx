import React from "react";
import ReactDOM from "react-dom/client";
import { Boundary } from "@shared/Boundary";
import { TipLayer } from "@shared/TipLayer";
import { installErrorCapture } from "@shared/report";
import { installBrowserGuard } from "@shared/browserGuard";
import { showWhenPainted } from "@shared/windowShow";
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
// 켤 때 흰 화면 없이 — 숨긴 채 만든 창을 첫 화면을 그린 뒤 보인다(0.3.0)
showWhenPainted();
