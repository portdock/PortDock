// (0.10.0) 노출 표시 — 찾은 장비의 열린 포트(이미 확인한 것만) 가운데 인증 없는 산업 프로토콜·평문 관리 포트를 알린다.
// 새로 포트를 더 스캔하지 않는다. 판정·문구는 shared/exposure.ts(시험 있음)
import { exposedPorts, exposeLines } from "@shared/exposure";
import { tip } from "@shared/tips";
import type { Lang } from "./i18n";

/** 줄 표시 — 인증 없는 산업 프로토콜·평문 로그인이 열렸으면 «노출» 표(HTTP 만이면 표시 없음 — 상세 칸에만) */
export function ExposeMark({ ports, lang }: { ports: number[]; lang: Lang }) {
  if (!exposedPorts(ports).some((p) => p.kind !== "web")) return null;
  return (
    <span className="mark expose" title={exposeLines(ports, lang).join("\n")}>
      {lang === "ko" ? "노출" : "Exposed"}
    </span>
  );
}

/** 상세 칸 — 종류마다 한 줄 + 하지 않는 것 */
export function ExposeNote({ ports, lang }: { ports: number[]; lang: Lang }) {
  const lines = exposeLines(ports, lang);
  if (!lines.length) return null;
  return (
    <div className="expose-note" role="note" data-tip={tip(lang, "nsExpose")}>
      {lines.map((l) => (
        <div key={l}>⚠ {l}</div>
      ))}
      <div className="hint">{lang === "ko" ? "확인한 포트만 보고 알립니다 — 장비 설정은 바꾸지 않습니다. 망 분리 확인 순서는 도움말 «노출 표시» 에 있습니다." : "Based only on the ports already checked — no device settings are changed. Steps for checking network separation are in Help «Exposure notes»."}</div>
    </div>
  );
}
