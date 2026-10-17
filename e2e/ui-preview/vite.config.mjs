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

export default defineConfig({
  root: path.join(repo, "apps", app),
  plugins: [react(), { name: "portdock-mock", transformIndexHtml: (h) => h.replace("<head>", `<head><script type="module" src="/@fs/${mock}"></script>`) }],
  resolve: { alias: { "@shared": path.join(repo, "shared") } },
  server: { port: Number(process.env.PORT ?? 5201), strictPort: true, fs: { allow: [repo] } },
  logLevel: "error",
});
