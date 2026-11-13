// 세 칸 — 패킷 목록(가상 스크롤)·해석 트리·바이트 칸, 우클릭 메뉴, 칸 크기 막대
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import type { Detail, Row } from "./api";
import { api } from "./api";
import { COLUMN_IDS, colWidth, flattenTree, fromB64, gridTemplate, hexLines, inRange, missingChunks, moveSel, nodeFilters, pathKey, printable, rtText, scrollToShow, timeText, visibleCols, windowOf, type ColCfg, type ColId, type FlatNode, type TimeMode } from "./logic";
import type { TFn } from "./i18n";

const CHUNK = 100;
const MAX_CHUNKS = 80;

// ---------------------------------------------------------------- 우클릭 메뉴

export interface MenuItem {
  label: string;
  run?: () => void;
  disabled?: boolean;
  /** 체크 표시(열 고르기) */
  checked?: boolean;
  keepOpen?: boolean;
}

export function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: MenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  useLayoutEffect(() => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos({ x: Math.max(0, Math.min(x, window.innerWidth - r.width - 4)), y: Math.max(0, Math.min(y, window.innerHeight - r.height - 4)) });
  }, [x, y, items.length]);
  useEffect(() => {
    const off = (e: Event) => {
      if (!(e.target instanceof Node && ref.current?.contains(e.target))) onClose();
    };
    const key = (e: globalThis.KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("pointerdown", off, true);
    window.addEventListener("keydown", key);
    window.addEventListener("blur", onClose);
    return () => {
      window.removeEventListener("pointerdown", off, true);
      window.removeEventListener("keydown", key);
      window.removeEventListener("blur", onClose);
    };
  }, [onClose]);
  return (
    <div className="pk-menu" ref={ref} style={{ left: pos.x, top: pos.y }} role="menu">
      {items.map((it, i) => (
        <button
          key={i}
          role="menuitem"
          disabled={it.disabled}
          onClick={() => {
            it.run?.();
            if (!it.keepOpen) onClose();
          }}
        >
          <span className="chk">{it.checked === undefined ? "" : it.checked ? "✓" : ""}</span>
          {it.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- 칸 크기 막대

/** 끌어서 크기를 바꾼다. dir "v" = 위아래 막대(아래 칸 높이 조절), "h" = 좌우 막대(오른쪽 칸 너비 조절) */
export function Bar({ dir, size, onSize, min = 60, max = 2000, label, invert }: { dir: "v" | "h"; invert?: boolean; size: number; onSize: (n: number) => void; min?: number; max?: number; label: string }) {
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const bar = e.currentTarget;
    const p0 = dir === "v" ? e.clientY : e.clientX;
    const s0 = size;
    bar.setPointerCapture(e.pointerId);
    bar.classList.add("dragging");
    const move = (ev: globalThis.PointerEvent) => {
      const d = (dir === "v" ? ev.clientY : ev.clientX) - p0;
      onSize(Math.round(Math.max(min, Math.min(max, invert ? s0 + d : s0 - d))));
    };
    const up = () => {
      bar.classList.remove("dragging");
      bar.removeEventListener("pointermove", move);
      bar.removeEventListener("pointerup", up);
      bar.removeEventListener("pointercancel", up);
    };
    bar.addEventListener("pointermove", move);
    bar.addEventListener("pointerup", up);
    bar.addEventListener("pointercancel", up);
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 80 : 20;
    const grow = dir === "v" ? "ArrowUp" : "ArrowLeft";
    const shrink = dir === "v" ? "ArrowDown" : "ArrowRight";
    if (e.key === grow || e.key === shrink) {
      e.preventDefault();
      onSize(Math.max(min, Math.min(max, size + ((e.key === grow) !== !!invert ? step : -step))));
    }
  };
  return <div className={`pk-bar ${dir}`} role="separator" aria-orientation={dir === "v" ? "horizontal" : "vertical"} aria-label={label} title={label} tabIndex={0} onPointerDown={down} onKeyDown={key} />;
}

// ---------------------------------------------------------------- 패킷 목록

export interface ListProps {
  t: TFn;
  total: number;
  /** 바뀌면 캐시를 비운다(필터·분석 완료·파일) */
  viewKey: string;
  rowH: number;
  cols: ColCfg;
  setCols: (c: ColCfg) => void;
  timeMode: TimeMode;
  sel: number;
  onSel: (pos: number, row: Row | null) => void;
  onMenu: (e: { x: number; y: number }, row: Row, pos: number) => void;
  /** 밖에서 스크롤을 요청(찾기·짝으로 이동) — 위치와 요청 번호 */
  reveal: { pos: number; n: number } | null;
  onRows?: (pos: number, row: Row) => void;
  /** 실시간 캡처 중 — 갱신해도 스크롤을 유지하고, 맨 아래를 보고 있으면 따라간다 */
  live?: boolean;
}

const HEAD_KEYS: Record<ColId, "colNo" | "colTime" | "colSrc" | "colDst" | "colProto" | "colLen" | "colRt" | "colInfo"> = { no: "colNo", time: "colTime", src: "colSrc", dst: "colDst", proto: "colProto", len: "colLen", rt: "colRt", info: "colInfo" };

function rtCell(r: Row, t: TFn): { text: string; cls: string } {
  const st = r.pair?.status;
  if (r.pair?.role === "req" && (st === "timeout" || st === "closed")) return { text: t("noResp"), cls: "rt-bad" };
  if (r.pair?.role === "req" && st === "capture_end") return { text: t("pendingResp"), cls: "rt-dim" };
  if (r.pair?.role === "resp" && r.rtNs >= 0) return { text: rtText(r.rtNs), cls: st === "exception" ? "rt-bad" : "" };
  if (r.pair?.role === "resp" && st === "orphan") return { text: t("orphan"), cls: "rt-dim" };
  return { text: "", cls: "" };
}

export function PacketList(p: ListProps) {
  const { t, total, rowH, cols } = p;
  const box = useRef<HTMLDivElement>(null);
  const cache = useRef(new Map<number, Row[]>());
  const inflight = useRef(new Set<number>());
  const [ver, setVer] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewH, setViewH] = useState(400);
  const [head, setHead] = useState<{ x: number; y: number } | null>(null);
  const atBottom = useRef(true);

  // 보이는 높이
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewH(el.clientHeight));
    ro.observe(el);
    setViewH(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  // 캐시 비우기
  useEffect(() => {
    cache.current.clear();
    inflight.current.clear();
    setVer((v) => v + 1);
    if (p.live) {
      if (box.current && atBottom.current) box.current.scrollTop = box.current.scrollHeight;
    } else {
      if (box.current) box.current.scrollTop = 0;
      setScrollTop(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.viewKey]);

  const win = useMemo(() => windowOf(scrollTop, Math.max(0, viewH - 1), rowH, total), [scrollTop, viewH, rowH, total]);

  // 보이는 곳의 덩어리를 가져온다
  useEffect(() => {
    if (total <= 0) return;
    const key = p.viewKey;
    const need = missingChunks(win.first, win.last, CHUNK, (c) => cache.current.has(c) || inflight.current.has(c));
    for (const c of need) {
      inflight.current.add(c);
      api
        .rows(c * CHUNK, CHUNK)
        .then((r) => {
          if (key !== p.viewKey) return;
          cache.current.set(c, r.rows);
          if (cache.current.size > MAX_CHUNKS) {
            const mid = Math.floor((win.first + win.last) / 2 / CHUNK);
            const far = [...cache.current.keys()].sort((a, b) => Math.abs(b - mid) - Math.abs(a - mid))[0];
            cache.current.delete(far);
          }
          setVer((v) => v + 1);
        })
        .catch(() => {})
        .finally(() => inflight.current.delete(c));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win.first, win.last, p.viewKey, total, ver]);

  const rowAt = (pos: number): Row | null => cache.current.get(Math.floor(pos / CHUNK))?.[pos % CHUNK] ?? null;

  // 밖에서 위치를 보이게 요청
  useEffect(() => {
    if (!p.reveal || !box.current) return;
    const el = box.current;
    const to = scrollToShow(p.reveal.pos, el.scrollTop, el.clientHeight - 1, rowH, total);
    if (to !== null) el.scrollTop = to;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.reveal?.n]);

  const keyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const el = box.current!;
    const page = Math.max(1, Math.floor(el.clientHeight / rowH) - 1);
    const to = moveSel(p.sel, e.key, page, total);
    if (to < 0) return;
    p.onSel(to, rowAt(to));
    const sc = scrollToShow(to, el.scrollTop, el.clientHeight - 1, rowH, total);
    if (sc !== null) el.scrollTop = sc;
  };

  const vis = visibleCols(cols);
  const tpl = gridTemplate(cols);
  const rows: ReactNode[] = [];
  for (let pos = win.first; pos <= win.last && pos < total; pos++) {
    const r = rowAt(pos);
    if (!r) {
      rows.push(<div key={pos} className="pk-row blank" style={{ height: rowH }} />);
      continue;
    }
    const rc = rtCell(r, t);
    const cell = (c: ColId) => {
      switch (c) {
        case "no":
          return <span className="num">{r.no}</span>;
        case "time":
          return <span className="num">{timeText(r, p.timeMode)}</span>;
        case "src":
          return <span className="ellipsis">{r.src}</span>;
        case "dst":
          return <span className="ellipsis">{r.dst}</span>;
        case "proto":
          return <span className="ellipsis">{r.proto}</span>;
        case "len":
          return <span className="num">{r.len}</span>;
        case "rt":
          return <span className={`num ${rc.cls}`}>{rc.text}</span>;
        case "info":
          return (
            <span className="ellipsis" title={r.info}>
              {r.pair?.peer ? <span className="pair-mark">{r.pair.role === "req" ? "→" : "←"}#{r.pair.peer} </span> : null}
              {r.info}
            </span>
          );
      }
    };
    rows.push(
      <div
        key={pos}
        className={`pk-row c-${r.color || "plain"}${pos === p.sel ? " sel" : ""}`}
        style={{ height: rowH, gridTemplateColumns: tpl }}
        data-pos={pos}
        onPointerDown={(e) => e.button === 0 && p.onSel(pos, r)}
        onContextMenu={(e) => {
          e.preventDefault();
          p.onSel(pos, r);
          p.onMenu({ x: e.clientX, y: e.clientY }, r, pos);
        }}
      >
        {vis.map((c) => (
          <div key={c} className={`cell col-${c}`}>
            {cell(c)}
          </div>
        ))}
      </div>,
    );
  }

  const resize = (id: ColId, e: PointerEvent<HTMLSpanElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const x0 = e.clientX;
    const w0 = colWidth(cols, id);
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const move = (ev: globalThis.PointerEvent) => p.setCols({ ...cols, widths: { ...cols.widths, [id]: Math.max(40, w0 + ev.clientX - x0) } });
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
  };

  return (
    <div className="pk-list" role="grid" aria-label={t("listLabel")} aria-rowcount={total}>
      <div
        className="pk-head"
        style={{ gridTemplateColumns: tpl }}
        onContextMenu={(e) => {
          e.preventDefault();
          setHead({ x: e.clientX, y: e.clientY });
        }}
      >
        {vis.map((c) => (
          <div key={c} className={`hcell col-${c}`}>
            <span className="ellipsis">{t(HEAD_KEYS[c])}</span>
            {c !== "info" && <span className="grip" onPointerDown={(e) => resize(c, e)} onDoubleClick={() => p.setCols({ ...cols, widths: { ...cols.widths, [c]: undefined } })} />}
          </div>
        ))}
      </div>
      <div className="pk-scroll" ref={box} tabIndex={0} onKeyDown={keyDown} onScroll={(e) => {
        const el = e.currentTarget;
        atBottom.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
        setScrollTop(el.scrollTop);
      }}>
        <div style={{ height: win.spacer, position: "relative" }}>
          <div className="pk-rows" style={{ transform: `translateY(${win.offset}px)` }}>
            {rows}
          </div>
        </div>
      </div>
      {head && (
        <ContextMenu
          x={head.x}
          y={head.y}
          onClose={() => setHead(null)}
          items={COLUMN_IDS.map((c) => ({
            label: t(HEAD_KEYS[c]),
            checked: !cols.hidden.includes(c),
            keepOpen: true,
            run: () => p.setCols({ ...cols, hidden: cols.hidden.includes(c) ? cols.hidden.filter((x) => x !== c) : [...cols.hidden, c] }),
          }))}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- 해석 트리

export interface TreeProps {
  t: TFn;
  detail: Detail | null;
  selPath: string | null;
  onPick: (n: FlatNode) => void;
  onMenu: (e: { x: number; y: number }, n: FlatNode) => void;
}

export function TreeView({ t, detail, selPath, onPick, onMenu }: TreeProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [deep, setDeep] = useState<Set<string>>(new Set());
  const tree = detail?.tree;
  // 새 패킷: 맨 위 «Frame» 묶음은 접어 둔다(Wireshark 와 같게)
  useEffect(() => {
    setCollapsed(new Set(["0"]));
    setDeep(new Set());
  }, [detail?.no]);
  const flat = useMemo(() => (tree ? flattenTree(tree, collapsed, deep) : []), [tree, collapsed, deep]);
  const toggle = (n: FlatNode) => {
    const key = pathKey(n.path);
    if (n.depth <= 1) setCollapsed((s) => (s.has(key) ? new Set([...s].filter((x) => x !== key)) : new Set(s).add(key)));
    else setDeep((s) => (s.has(key) ? new Set([...s].filter((x) => x !== key)) : new Set(s).add(key)));
  };
  const keyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = flat.findIndex((f) => pathKey(f.path) === selPath);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const to = flat[Math.max(0, Math.min(flat.length - 1, (i < 0 ? 0 : i) + (e.key === "ArrowDown" ? 1 : -1)))];
      if (to) onPick(to);
    } else if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && i >= 0) {
      e.preventDefault();
      const n = flat[i];
      if (n.hasKids && n.open === (e.key === "ArrowLeft")) toggle(n);
    }
  };
  if (!detail) return <div className="pk-empty hint">{t("treeEmpty")}</div>;
  return (
    <div className="pk-tree" role="tree" tabIndex={0} onKeyDown={keyDown}>
      {flat.map((n) => {
        const key = pathKey(n.path);
        return (
          <div
            key={key}
            role="treeitem"
            aria-expanded={n.hasKids ? n.open : undefined}
            className={`tn${key === selPath ? " sel" : ""}${n.node.expert ? ` ex-${n.node.expert}` : ""}`}
            style={{ paddingLeft: 6 + n.depth * 16 }}
            onClick={() => onPick(n)}
            onDoubleClick={() => n.hasKids && toggle(n)}
            onContextMenu={(e) => {
              e.preventDefault();
              onPick(n);
              onMenu({ x: e.clientX, y: e.clientY }, n);
            }}
          >
            <span
              className={`tw${n.hasKids ? "" : " leaf"}`}
              onClick={(e) => {
                e.stopPropagation();
                if (n.hasKids) toggle(n);
              }}
            >
              {n.hasKids ? (n.open ? "▾" : "▸") : ""}
            </span>
            <span className="tl">{n.node.label}</span>
            {n.node.len > 0 && (
              <span className="trng" title={t("byteRange", { a: n.node.start, b: n.node.start + n.node.len })}>
                [{n.node.start}+{n.node.len}]
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- 바이트 칸

export function HexView({ t, detail, sel }: { t: TFn; detail: Detail | null; sel: { start: number; len: number } | null }) {
  const data = useMemo(() => (detail ? fromB64(detail.bytes) : new Uint8Array()), [detail]);
  const lines = useMemo(() => hexLines(data.length > 16384 ? data.subarray(0, 16384) : data), [data]);
  const selRef = useRef<HTMLSpanElement>(null);
  useEffect(() => selRef.current?.scrollIntoView({ block: "nearest" }), [sel?.start, sel?.len, detail?.no]);
  if (!detail) return <div className="pk-empty hint">{t("hexEmpty")}</div>;
  let first = true;
  return (
    <div className="pk-hex mono" aria-label={t("hexLabel")}>
      {lines.map((l) => (
        <div className="hl" key={l.offset}>
          <span className="off">{l.offset.toString(16).padStart(4, "0")}</span>
          <span className="hx">
            {l.bytes.map((b, k) => {
              const i = l.offset + k;
              const on = inRange(i, sel);
              const ref = on && first ? ((first = false), selRef) : undefined;
              return (
                <span key={k} ref={ref} className={on ? "b on" : "b"}>
                  {b.toString(16).padStart(2, "0")}
                </span>
              );
            })}
          </span>
          <span className="as">
            {l.bytes.map((b, k) => (
              <span key={k} className={inRange(l.offset + k, sel) ? "on" : undefined}>
                {printable(b)}
              </span>
            ))}
          </span>
        </div>
      ))}
      {data.length > 16384 && <div className="hint">{t("hexTruncated", { n: data.length })}</div>}
    </div>
  );
}

export { nodeFilters };
