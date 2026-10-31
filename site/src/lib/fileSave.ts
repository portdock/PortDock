// 브라우저에서 파일로 저장(서버로 보내지 않음) — 배선도·구성도 웹 도구가 같이 쓴다. DOM 이 필요해 node 시험은 없다.
import { DARK, LIGHT, type Palette } from "./diagramSvg.ts";

/** 지금 화면 색(밝게/어둡게) */
export const screenPalette = (): Palette => (typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches ? DARK : LIGHT);

/** 밝게/어둡게가 바뀌면 다시 그리기 */
export function onThemeChange(fn: () => void) {
  if (typeof matchMedia !== "function") return;
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", fn);
}

export function saveBlob(blob: Blob, name: string) {
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 2000);
}

export const saveText = (text: string, name: string, type: string) => saveBlob(new Blob([text], { type }), name);

/** SVG 글 → PNG(2배 크기) 저장 */
export function savePng(svg: string, name: string, scale = 2): Promise<void> {
  return new Promise((resolve, reject) => {
    const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    const w = m ? Number(m[1]) : 800;
    const h = m ? Number(m[2]) : 600;
    const img = new Image();
    const u = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = Math.round(w * scale);
        c.height = Math.round(h * scale);
        const g = c.getContext("2d");
        if (!g) throw new Error("canvas");
        g.drawImage(img, 0, 0, c.width, c.height);
        c.toBlob((b) => {
          URL.revokeObjectURL(u);
          if (!b) return reject(new Error("png"));
          saveBlob(b, name);
          resolve();
        }, "image/png");
      } catch (e) {
        URL.revokeObjectURL(u);
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(u);
      reject(new Error("svg"));
    };
    img.src = u;
  });
}

/** 파일 이름에 쓸 날짜 «20261031-1405» */
export const fileStamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
};

/** localStorage — 막힌 브라우저(사생활 보호 창 등)에서도 오류 없이 */
export const store = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, v: string) {
    try {
      localStorage.setItem(key, v);
      return true;
    } catch {
      return false;
    }
  },
  remove(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* 무시 */
    }
  },
};
