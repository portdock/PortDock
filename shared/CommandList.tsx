// 명령 목록 — Serial·TCP·UDP 공통.
// ▶ 보내기(이름 칸 Enter·더블클릭도), ✎ 입력칸으로, ⧉ 복제, ↑↓·Alt+↑↓ 순서, ✕ 지우기(확인 창 대신 5초 «되돌리기»),
// 목록만 내보내기·가져오기(JSON, 가져올 때 «뒤에 추가 / 목록 바꾸기» 를 칸 안에서 묻는다).
// 명령마다 단축키 F2·F3·F5~F12(F1 도움말·F4 연결 제외)를 줄 수 있다 — 겹치지 않게 고르기에서 막는다.
import { useEffect, useImperativeHandle, useRef, useState, type Dispatch, type Ref, type SetStateAction } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { CHECKSUMS, type ChecksumKind, type CkOpts } from "./format";
import { overlayOpen } from "./shortcuts";
import type { ToastApi } from "./Toast";
import { io } from "./ioText";
import { ui, type Lang } from "./uiText";
import "./io.css";

export interface Cmd {
  name: string;
  text: string;
  mode: "hex" | "ascii";
  checksum: ChecksumKind | null;
  suffix: string;
  /** 체크섬 자리 옵션·범용 CRC 매개변수 */
  ck?: CkOpts | null;
  /** 단축키(F2·F3·F5~F12) */
  key?: string | null;
}

/** 명령에 줄 수 있는 단축키 — F1 은 도움말, F4 는 연결·끊기 */
export const CMD_KEYS = ["F2", "F3", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"];

/** 저장·가져온 체크섬 옵션 정리(모양이 틀리면 버린다) */
function cleanCk(v: unknown): CkOpts | null {
  if (!v || typeof v !== "object") return null;
  const o = v as CkOpts;
  const n = (x: unknown) => (typeof x === "number" && Number.isInteger(x) && x >= 0 && x <= 255 ? x : 0);
  const out: CkOpts = { skipHead: n(o.skipHead), beforeEnd: n(o.beforeEnd), swap: !!o.swap };
  const c = o.crc;
  if (c && typeof c === "object" && [8, 16, 32].includes(c.width) && [c.poly, c.init, c.xorout].every((x) => typeof x === "number" && x >= 0))
    out.crc = { width: c.width, poly: c.poly >>> 0, init: c.init >>> 0, refin: !!c.refin, refout: !!c.refout, xorout: c.xorout >>> 0 };
  return out;
}

export type CommandListHandle = {
  /** i 번째 이름 칸에 포커스(글자 전체 고름) — 보이지 않으면(좁은 창에서 접힘) 아무 일 없음 */
  focusName: (i: number) => void;
};

/** 파일·붙여 넣은 값에서 명령만 골라낸다. 모양이 틀린 항목이 하나라도 있으면 null */
export function parseCommands(json: string): Cmd[] | null {
  let body: unknown;
  try {
    body = JSON.parse(json);
  } catch {
    return null;
  }
  // 명령 목록 파일 · 배열 그대로 · 설정 백업 파일(data.commands) 모두 받는다
  const b = body as { commands?: unknown; data?: { commands?: unknown } };
  const list = Array.isArray(body) ? body : Array.isArray(b?.commands) ? b.commands : Array.isArray(b?.data?.commands) ? b.data!.commands : null;
  if (!Array.isArray(list)) return null;
  const kinds = new Set<string>([...CHECKSUMS.map((c) => c.kind), "crc"]);
  const out: Cmd[] = [];
  const used = new Set<string>();
  for (const x of list as Partial<Cmd>[]) {
    if (!x || typeof x !== "object" || typeof x.text !== "string" || (x.mode !== "hex" && x.mode !== "ascii")) return null;
    const checksum = x.checksum == null ? null : kinds.has(x.checksum) ? x.checksum : undefined;
    if (checksum === undefined) return null;
    const ck = cleanCk(x.ck);
    // 범용 CRC 인데 매개변수가 없으면 쓸 수 없다
    if (checksum === "crc" && !ck?.crc) return null;
    const key = typeof x.key === "string" && CMD_KEYS.includes(x.key) && !used.has(x.key) ? x.key : null;
    if (key) used.add(key);
    const c: Cmd = { name: typeof x.name === "string" && x.name ? x.name : x.text.slice(0, 24) || "cmd", text: x.text, mode: x.mode, checksum, suffix: typeof x.suffix === "string" ? x.suffix : "" };
    if (ck) c.ck = ck;
    if (key) c.key = key;
    out.push(c);
  }
  return out;
}

/** 같은 이름이 있으면 « (2)», « (3)» … */
function freeName(base: string, list: { name: string }[]) {
  const stem = base.replace(/ \(\d+\)$/, "");
  for (let n = 2; ; n++) {
    const cand = `${stem} (${n})`;
    if (!list.some((c) => c.name === cand)) return cand;
  }
}

export function CommandList<C extends Cmd>({
  lang,
  app,
  title,
  commands,
  setCommands,
  onSend,
  canSend,
  sendWhy,
  onEdit,
  toast,
  writeText,
  readText,
  handle,
}: {
  lang: Lang;
  /** 내보낸 파일 머리(프로그램 이름) */
  app: string;
  title: string;
  commands: C[];
  setCommands: Dispatch<SetStateAction<C[]>>;
  onSend: (c: C) => void;
  canSend: boolean;
  /** 보낼 수 없는 이유(▶ 말풍선·Enter 때 알림) */
  sendWhy?: string;
  onEdit: (c: C) => void;
  toast: ToastApi;
  writeText: (path: string, text: string) => Promise<void>;
  readText: (path: string) => Promise<string>;
  handle?: Ref<CommandListHandle>;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState<{ file: string; cmds: C[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const focusName = (i: number) => {
    // 새 줄이 그려진 뒤에
    requestAnimationFrame(() => {
      const el = root.current?.querySelectorAll<HTMLInputElement>(".cmdname")[i];
      if (el && el.offsetParent) {
        el.focus();
        el.select();
      }
    });
  };
  useImperativeHandle(handle, () => ({ focusName }), []);

  const send = (c: C) => {
    if (canSend) onSend(c);
    else if (sendWhy) toast.show(sendWhy, { error: true });
  };
  // F2·F3·F5~F12 — 입력칸 안에서도(글자를 쓰는 키가 아니다). 대화상자·메뉴가 열려 있거나 한글 조합 중이면 쉰다
  const keyRef = useRef({ commands, send, lang });
  keyRef.current = { commands, send, lang };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!CMD_KEYS.includes(e.key) || e.ctrlKey || e.altKey || e.shiftKey || e.metaKey || e.isComposing || e.keyCode === 229) return;
      const { commands, send } = keyRef.current;
      const c = commands.find((x) => x.key === e.key);
      if (!c) return;
      // 배포판은 F5·F12 를 먼저 막는다(browserGuard) — 그래도 명령은 보낸다. 대화상자가 열려 있으면 그쪽 몫
      if (overlayOpen()) return;
      e.preventDefault();
      if (e.repeat) return;
      send(c);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= commands.length) return;
    setCommands((cur) => {
      const next = cur.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    focusName(j);
  };
  const dup = (i: number) => {
    const c = commands[i];
    // 단축키는 겹치지 않게 복제본에서 뺀다
    setCommands((cur) => [...cur.slice(0, i + 1), { ...c, name: freeName(c.name, cur), key: null }, ...cur.slice(i + 1)]);
    focusName(i + 1);
  };
  const del = (i: number) => {
    const c = commands[i];
    setCommands((cur) => cur.filter((_, j) => j !== i));
    toast.show(ui(lang, "deletedCmd", { a: c.name }), {
      undo: () => setCommands((cur) => [...cur.slice(0, Math.min(i, cur.length)), c, ...cur.slice(Math.min(i, cur.length))]),
    });
  };

  async function doExport() {
    setErr(null);
    const slug = app.replace(/\s+/g, "-").toLowerCase();
    const path = await save({ defaultPath: `${slug}-commands.json`, filters: [{ name: "JSON", extensions: ["json"] }] }).catch(() => null);
    if (!path) return;
    const body = { app, kind: "commands", version: 1, exported: new Date().toISOString(), commands: commands.map(({ name, text, mode, checksum, suffix, ck, key }) => ({ name, text, mode, checksum, suffix, ...(ck ? { ck } : {}), ...(key ? { key } : {}) })) };
    await writeText(path, JSON.stringify(body, null, 2)).catch((e) => setErr(String(e)));
  }
  async function doImport() {
    setErr(null);
    setPending(null);
    const path = await open({ filters: [{ name: "JSON", extensions: ["json"] }] }).catch(() => null);
    if (!path || Array.isArray(path)) return;
    let cmds: Cmd[] | null;
    try {
      cmds = parseCommands(await readText(path));
    } catch (e) {
      setErr(String(e));
      return;
    }
    if (!cmds) return setErr(ui(lang, "cmdBadFile"));
    if (!cmds.length) return setErr(ui(lang, "cmdNone"));
    const file = path.split(/[\\/]/).pop() ?? path;
    // 지금 목록이 비어 있으면 묻지 않고 넣는다
    if (!commands.length) {
      setCommands(cmds as C[]);
      toast.show(ui(lang, "addedCmds", { n: cmds.length }));
    } else setPending({ file, cmds: cmds as C[] });
  }
  const apply = (how: "add" | "replace") => {
    if (!pending) return;
    const before = commands;
    if (how === "add") {
      // 이미 쓰는 단축키는 가져온 쪽에서 뺀다
      const taken = new Set(commands.map((c) => c.key).filter(Boolean));
      setCommands((cur) => [...cur, ...pending.cmds.map((c) => (c.key && taken.has(c.key) ? { ...c, key: null } : c))]);
      toast.show(ui(lang, "addedCmds", { n: pending.cmds.length }), { undo: () => setCommands(before) });
    } else {
      setCommands(pending.cmds);
      toast.show(ui(lang, "replacedCmds", { n: pending.cmds.length }), { undo: () => setCommands(before) });
    }
    setPending(null);
  };

  return (
    <div className="cmdlist" ref={root}>
      <h3>{title}</h3>
      <div className="cmds">
        {commands.length === 0 && <div className="hint">{ui(lang, "cmdEmpty")}</div>}
        {commands.map((c, i) => (
          <div key={i} className="cmd" title={c.text}>
            <span className="cmd-move">
              <button type="button" className="mv" onClick={() => move(i, -1)} disabled={i === 0} data-tip={ui(lang, "cmdUpTip")} aria-label={ui(lang, "cmdUpTip")}>
                ↑
              </button>
              <button type="button" className="mv" onClick={() => move(i, 1)} disabled={i === commands.length - 1} data-tip={ui(lang, "cmdDownTip")} aria-label={ui(lang, "cmdDownTip")}>
                ↓
              </button>
            </span>
            <input
              className="cmdname"
              value={c.name}
              aria-label={ui(lang, "cmdName")}
              spellCheck={false}
              onChange={(e) => {
                const name = e.target.value;
                setCommands((cur) => cur.map((x, j) => (j === i ? { ...x, name } : x)));
              }}
              onDoubleClick={() => send(c)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === "Enter") {
                  e.preventDefault();
                  send(c);
                } else if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
                  e.preventDefault();
                  move(i, e.key === "ArrowUp" ? -1 : 1);
                }
              }}
            />
            <select
              className={`cmd-key${c.key ? " on" : ""}`}
              value={c.key ?? ""}
              onChange={(e) => {
                const key = e.target.value || null;
                setCommands((cur) => cur.map((x, j) => (j === i ? { ...x, key } : x)));
              }}
              data-tip={io(lang, "cmdKeyTip")}
              aria-label={io(lang, "cmdKeyTip")}
            >
              <option value="">{io(lang, "cmdKeyNone")}</option>
              {CMD_KEYS.map((k) => {
                const owner = commands.find((x, j) => j !== i && x.key === k);
                return (
                  <option key={k} value={k} disabled={!!owner}>
                    {owner ? io(lang, "cmdKeyTaken", { k, a: owner.name }) : k}
                  </option>
                );
              })}
            </select>
            <button type="button" className="btn small" onClick={() => onSend(c)} disabled={!canSend} data-tip={canSend ? ui(lang, "cmdSendTip") : (sendWhy ?? ui(lang, "cmdSendTip"))} aria-label={ui(lang, "cmdSendTip")}>
              ▶
            </button>
            <button type="button" className="btn small ghost" onClick={() => onEdit(c)} data-tip={ui(lang, "cmdEditTip")} aria-label={ui(lang, "cmdEditTip")}>
              ✎
            </button>
            <button type="button" className="btn small ghost" onClick={() => dup(i)} data-tip={ui(lang, "cmdDupTip")} aria-label={ui(lang, "cmdDupTip")}>
              ⧉
            </button>
            <button type="button" className="btn small ghost" onClick={() => del(i)} data-tip={ui(lang, "cmdDelTip")} aria-label={ui(lang, "cmdDelTip")}>
              ✕
            </button>
          </div>
        ))}
      </div>
      {pending && (
        <div className="cmd-import" role="group">
          <span>{ui(lang, "cmdImportAsk", { a: pending.file, n: pending.cmds.length })}</span>
          <span className="row-btns">
            <button type="button" className="btn small primary" onClick={() => apply("add")} autoFocus>
              {ui(lang, "cmdImportAdd")}
            </button>
            <button type="button" className="btn small" onClick={() => apply("replace")}>
              {ui(lang, "cmdImportReplace")}
            </button>
            <button type="button" className="btn small ghost" onClick={() => setPending(null)}>
              {ui(lang, "cancel")}
            </button>
          </span>
        </div>
      )}
      <div className="cmd-tools">
        <button type="button" className="btn small" onClick={doExport} disabled={!commands.length} data-tip={ui(lang, "cmdExportTip")}>
          {ui(lang, "cmdExport")}
        </button>
        <button type="button" className="btn small" onClick={doImport} data-tip={ui(lang, "cmdImportTip")}>
          {ui(lang, "cmdImport")}
        </button>
      </div>
      {err && <div className="error">{err}</div>}
    </div>
  );
}
