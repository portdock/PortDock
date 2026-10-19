import { useEffect, useMemo, useState, type ReactElement } from "react";
import { autoSendAvailable, ISSUES_URL, REPORT_EMAIL } from "./report";
import { useRestoreFocus } from "./restoreFocus";

export interface HelpSection {
  title: string;
  /** 화면에서 이 절을 바로 열 때 쓰는 이름(예: «start» — 처음 쓰는 순서). 두 언어에 같은 id 를 단다 */
  id?: string;
  /** 한 줄씩. «- » 로 시작하면 글머리표 */
  body: string[];
}
export type HelpDoc = Record<"ko" | "en", HelpSection[]>;

/** 모든 프로그램 공통 — 문제 보고. 받는 곳이 비어 숨은 기능은 말하지 않는다 */
function reportHelp(lang: "ko" | "en"): HelpSection {
  const auto = autoSendAvailable();
  const ko = lang === "ko";
  const ways = [
    auto && (ko ? "«지금 바로 보내기»(인터넷 필요, 계정 필요 없음)" : "«Send now» (internet, no account needed)"),
    REPORT_EMAIL && (ko ? "«이메일로 보내기»" : "«Send by email»"),
    ISSUES_URL && (ko ? "«GitHub 이슈로 보내기»(공개됨)" : "«Open a GitHub issue» (public)"),
    ko ? "«복사»" : "«Copy»",
    ko ? "«파일로 저장»" : "«Save to file»",
  ].filter(Boolean) as string[];
  const ways2 = ko ? `${ways.join(", ")} 중에서 고릅니다.` : `Choose ${ways.slice(0, -1).join(", ")} or ${ways[ways.length - 1]}.`;
  const h = REPORT_HELP[lang];
  return {
    title: h.title,
    body: h.body
      .map((l) => (l.startsWith("- «지금 바로 보내기»") || l.startsWith("- Choose «Send now»") ? `- ${ways2}${ko ? " 인터넷이 없는 PC 는 파일로 저장해 옮기세요." : " On an offline PC, save to a file and move it."}` : l))
      // 자동 전송 받는 곳이 없으면 설정에도 그 항목이 없다
      .filter((l) => auto || !l.startsWith("- ⚙")),
  };
}

const REPORT_HELP: Record<"ko" | "en", HelpSection> = {
  ko: {
    title: "문제 보고(!)",
    body: [
      "오류·버그를 개발자에게 알리는 기능입니다. 머리줄의 «!» 버튼으로 엽니다.",
      "- «무슨 일이 있었나요?» 에 하던 작업과 누른 버튼을 적습니다.",
      "- 넣을 내용을 고릅니다: 이번 실행의 오류, 오류로 꺼진 기록, 연결·화면 설정, 최근 통신 기록 200줄(기본 꺼짐 — 회사 데이터 주의). 명령 목록·규칙은 넣지 않습니다.",
      "- 미리보기에서 보낼 내용을 그대로 확인할 수 있습니다.",
      "- «지금 바로 보내기»(인터넷 필요, 계정 필요 없음), «이메일로 보내기», «GitHub 이슈로 보내기»(공개됨), «복사», «파일로 저장» 중에서 고릅니다. 인터넷이 없는 PC 는 파일로 저장해 옮기세요.",
      "- 프로그램이 오류로 꺼지면 원인이 이 PC 에 남고, 다음에 켤 때 보낼지 묻습니다. 그동안 «!» 버튼이 빨갛게 보입니다.",
      "- 화면이 깨지면 그 자리에 «문제 보고»·«다시 열기» 버튼이 나옵니다.",
      "- ⚙ 설정의 «오류 자동 전송»: «오류로 꺼지면 묻기»(기본), «묻지 않고 자동으로 보내기», «보내지 않기». 자동 전송은 오류 원인과 프로그램·윈도우 버전만 보내고, 통신 내용·명령·규칙·IP 는 보내지 않습니다. 인터넷이 없으면 다음 실행 때 다시 시도합니다.",
    ],
  },
  en: {
    title: "Report a problem (!)",
    body: [
      "Tell the developer about errors and bugs. Open it with the «!» button in the header.",
      "- Describe what you were doing and what you clicked.",
      "- Choose what to include: errors from this session, crash records, connection/display settings, the last 200 traffic lines (off by default — mind company data). Commands and rules are never included.",
      "- The preview shows exactly what will be sent.",
      "- Choose «Send now» (internet, no account needed), «Send by email», «Open a GitHub issue» (public), «Copy» or «Save to file». On an offline PC, save to a file and move it.",
      "- If the program crashes, the cause is kept on this PC and you are asked next time whether to send it. Until then the «!» button is red.",
      "- If the screen crashes, «Report a problem» and «Reload» buttons appear in its place.",
      "- ⚙ «Automatic error reports»: «Ask after a crash» (default), «Send automatically», «Never send». Automatic reports contain only the error cause and the program/Windows version — never traffic, commands, rules or IP settings. Offline PCs retry on the next start.",
    ],
  },
};

const UI = {
  ko: { title: "도움말", search: "찾기…", close: "닫기", none: "찾는 내용이 없습니다" },
  en: { title: "Help", search: "Search…", close: "Close", none: "No matches" },
};

/** 섹션 목록(왼쪽) + 본문(오른쪽). 찾기 칸으로 걸러 보고, Esc 로 닫는다. start 를 주면 그 id 의 절을 열고 시작한다 */
export function HelpDialog({ doc, lang, app, onClose, start }: { doc: HelpDoc; lang: "ko" | "en"; app: string; onClose: () => void; start?: string | null }) {
  const ui = UI[lang];
  const sections = useMemo(() => [...doc[lang], reportHelp(lang)], [doc, lang]);
  const [q, setQ] = useState("");
  const [cur, setCur] = useState(() => Math.max(0, start ? sections.findIndex((s) => s.id === start) : 0));
  const back = useRestoreFocus<HTMLDivElement>();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    return sections.map((s, i) => ({ s, i })).filter(({ s }) => !k || s.title.toLowerCase().includes(k) || s.body.some((b) => b.toLowerCase().includes(k)));
  }, [sections, q]);
  const active = shown.find((x) => x.i === cur) ?? shown[0];

  return (
    <div className="modal-back" ref={back} onClick={onClose}>
      <div className="modal help" role="dialog" aria-label={ui.title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <b>
            {app} · {ui.title}
          </b>
          <input className="help-search" value={q} placeholder={ui.search} onChange={(e) => setQ(e.target.value)} autoFocus />
          <button className="btn small ghost" onClick={onClose} title={ui.close} aria-label={ui.close}>
            ✕
          </button>
        </div>
        <div className="help-body">
          <nav className="help-toc">
            {shown.map(({ s, i }) => (
              <button key={i} className={active?.i === i ? "help-link on" : "help-link"} onClick={() => setCur(i)}>
                {s.title}
              </button>
            ))}
          </nav>
          <article className="help-text">
            {!active && <p className="hint">{ui.none}</p>}
            {active && (
              <>
                <h3>{active.s.title}</h3>
                {render(active.s.body)}
              </>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}

/** 이어진 «- » 줄은 하나의 목록으로 */
function render(lines: string[]) {
  const out: ReactElement[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      out.push(
        <ul key={`u${out.length}`}>
          {list.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  for (const l of lines) {
    if (l.startsWith("- ")) list.push(l.slice(2));
    else {
      flush();
      out.push(<p key={`p${out.length}`}>{l}</p>);
    }
  }
  flush();
  return out;
}

/** F1 로 도움말 열기 */
export function useHelpKey(open: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
}
