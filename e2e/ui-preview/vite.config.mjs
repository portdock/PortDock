// 화면 미리보기 — 백엔드(Rust) 없이 앱 화면만 브라우저에 띄운다(가짜 응답: mock.js).
// 사용: APP=serial PORT=5201 npx vite --config e2e/ui-preview/vite.config.mjs  (저장소 루트에서)
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const app = process.env.APP ?? "serial";
const mock = path.join(here, "mock.js").split(path.sep).join("/");
// 미리보기에서는 진짜 사용 통계 키를 쓰지 않는다: 보통은 키를 비워(묻는 카드·전송 없음) 기존 smoke 그대로,
// USAGE_PREVIEW=1 이면 가짜 키를 넣어 묻는 카드·설정 칸을 보인다(ui-preview/usage.mjs).
// 실제로 보내지는 않는다 — mock.js 가 바깥 fetch 를 막고, 아래 CSP 도 같은 서버만 연다
const previewUsageKey = {
  name: "portdock-usage-preview",
  transform: (code, id) =>
    id.split(path.sep).join("/").endsWith("/shared/usageData.ts")
      ? code.replace(/export const APTABASE_KEY = "[^"]*";/, `export const APTABASE_KEY = "${process.env.USAGE_PREVIEW === "1" ? "A-EU-0000000000" : ""}";`)
      : null,
};

export default defineConfig({
  root: path.join(repo, "apps", app),
  plugins: [react(), previewUsageKey, { name: "portdock-mock", transformIndexHtml: (h) => h.replace("<head>", `<head><script type="module" src="/@fs/${mock}"></script>`) }],
  resolve: { alias: { "@shared": path.join(repo, "shared") } },
  // CSP connect-src: mock.js 가 fetch 를 가로채지 못해도 바깥(Sentry 등)으로는 나가지 못하게 — 같은 서버와 HMR 웹소켓만
  server: {
    port: Number(process.env.PORT ?? 5201),
    strictPort: true,
    fs: { allow: [repo] },
    headers: { "Content-Security-Policy": "connect-src 'self' ws://localhost:* ws://127.0.0.1:*" },
  },
  logLevel: "error",
});
