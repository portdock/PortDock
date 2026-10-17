// 명령 목록 — Serial·TCP·UDP 공통.
// ▶ 보내기(이름 칸 Enter·더블클릭도), ✎ 입력칸으로, ⧉ 복제, ↑↓·Alt+↑↓ 순서, ✕ 지우기(확인 창 대신 5초 «되돌리기»),
// 목록만 내보내기·가져오기(JSON, 가져올 때 «뒤에 추가 / 목록 바꾸기» 를 칸 안에서 묻는다).
import { useImperativeHandle, useRef, useState, type Dispatch, type Ref, type SetStateAction } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { CHECKSUMS, type ChecksumKind } from "./format";
import type { ToastApi } from "./Toast";
import { ui, type Lang } from "./uiText";

export interface Cmd {
  name: string;
  text: string;
  mode: "hex" | "ascii";
  checksum: ChecksumKind | null;
  suffix: string;
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
  const kinds = new Set(CHECKSUMS.map((c) => c.kind));
  const out: Cmd[] = [];
  for (const x of list as Partial<Cmd>[]) {
    if (!x || typeof x !== "object" || typeof x.text !== "string" || (x.mode !== "hex" && x.mode !== "ascii")) return null;
    const checksum = x.checksum == null ? null : kinds.has(x.checksum) ? x.checksum : undefined;
    if (checksum === undefined) return null;
    out.push({ name: typeof x.name === "string" && x.name ? x.name : x.text.slice(0, 24) || "cmd", text: x.text, mode: x.mode, checksum, suffix: typeof x.suffix === "string" ? x.suffix : "" });
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
    setCommands((cur) => [...cur.slice(0, i + 1), { ...c, name: freeName(c.name, cur) }, ...cur.slice(i + 1)]);
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
    const body = { app, kind: "commands", version: 1, exported: new Date().toISOString(), commands: commands.map(({ name, text, mode, checksum, suffix }) => ({ name, text, mode, checksum, suffix })) };
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
      setCommands((cur) => [...cur, ...pending.cmds]);
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
