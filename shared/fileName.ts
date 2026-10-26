// 저장 파일 기본 이름(0.3.0) — «portdock-serial-COM3-20261026-153012.txt» 처럼 도구·포트(주소)·시각을 넣는다.
// React·Tauri 없는 부분(시험: node --test shared/fileName.test.ts)

const p2 = (n: number) => String(n).padStart(2, "0");

/** 파일 이름용 시각 «20261026-153012»(이 PC 시각) */
export function fileStamp(d: Date = new Date()) {
  return `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`;
}

/**
 * 파일 이름에 넣을 조각 — 영문·숫자·«.»·«_»·«-» 만 남기고 나머지(«:» «\» 공백·한글 등)는 «-» 로, 앞뒤 «-»·«.» 는 떼고 40자까지.
 * «192.168.0.10:502» → «192.168.0.10-502», «[fe80::1]:502» → «fe80-1-502»
 */
export function filePart(s: string) {
  return s
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 40)
    .replace(/[-.]+$/g, "");
}

/** «portdock-<도구>[-<어디>]-<시각>.<확장자>» — where 가 비거나 쓸 글자가 없으면 빠진다 */
export function saveName(tool: string, where: string | null | undefined, ext: string, d: Date = new Date()) {
  const w = where ? filePart(where) : "";
  return `portdock-${filePart(tool) || "log"}${w ? `-${w}` : ""}-${fileStamp(d)}.${ext}`;
}
