// 웹 도구 «시스템 구성도 그리기» 의 «변경 비교» — 전(기준)·후 구성도 문서 두 개를 비교한다. 화면 없이 계산만(node --test).
//   - 장비·버스는 id 로 짝짓고, 짝이 없으면 같은 종류·같은 이름(빈 이름 제외)으로 한 번 더 짝짓는다
//   - 바뀐 칸: 이름·종류·IP·마스크·국번·보율·패리티·종단·단위 부하·읽는 레지스터 수(위치는 보지 않는다)
//   - 선은 양 끝(짝지은 id)·종류로 비교
//   - RS-485 버스마다 전·후 장비 수·단위 부하·한 바퀴 폴링 어림(sysDiagram.busStats)
//   - 증설·제거 경고: 버스 끝 장비가 빠짐(종단 옮기기), 새 장비가 버스 끝에 붙음, 단위 부하 32 를 새로 넘음, 반납한 국번·IP
import { msg, tx } from "./tr.ts";
import { busStats, fmtUl, NODE_NAME, UL_MAX, type BusStat, type Finding, type Lang, type SysDoc, type SysLink, type SysNode } from "./sysDiagram.ts";

export type Change = "added" | "removed" | "changed";
export interface DiffRow {
  change: Change;
  what: "node" | "bus" | "link";
  /** 후 문서의 id(빠진 것은 전 문서의 id) */
  id: string;
  name: string;
  details: string[];
}
export interface BusImpact {
  /** 후 문서의 버스 id(빠진 버스는 전 문서 id) */
  id: string;
  name: string;
  before: BusStat | null;
  after: BusStat | null;
}
export interface DocDiff {
  rows: DiffRow[];
  buses: BusImpact[];
  findings: Finding[];
  /** 후 문서에서 더해진·바뀐 노드·버스 id(그림 강조) */
  added: Set<string>;
  changed: Set<string>;
  /** 빠진 장비(전 문서의 것 — 그림에 점선으로) */
  removed: SysNode[];
  same: boolean;
}

/** 전 id → 후 id 짝짓기(id 먼저, 다음 같은 종류·이름) */
function pair<T extends { id: string; name: string; kind: string }>(before: T[], after: T[]): Map<string, string> {
  const m = new Map<string, string>();
  const afterIds = new Set(after.map((x) => x.id));
  const used = new Set<string>();
  for (const b of before)
    if (afterIds.has(b.id)) {
      m.set(b.id, b.id);
      used.add(b.id);
    }
  for (const b of before) {
    if (m.has(b.id) || !b.name.trim()) continue;
    const a = after.find((x) => !used.has(x.id) && !before.some((y) => y.id === x.id) && x.kind === b.kind && x.name.trim() === b.name.trim());
    if (a) {
      m.set(b.id, a.id);
      used.add(a.id);
    }
  }
  return m;
}

export function diffDocs(before: SysDoc, after: SysDoc, lang: Lang): DocDiff {
  const t = (k: string, e: string) => msg(lang, k, e);
  const nm = (n: { name: string; id: string }) => n.name || n.id;
  const rows: DiffRow[] = [];
  const findings: Finding[] = [];
  const added = new Set<string>();
  const changed = new Set<string>();
  const removed: SysNode[] = [];

  const nodeMap = pair(before.nodes, after.nodes);
  const busMap = pair(before.buses, after.buses);
  const mapId = (id: string) => nodeMap.get(id) ?? busMap.get(id) ?? null;
  const afterNode = new Map(after.nodes.map((n) => [n.id, n]));
  const afterBus = new Map(after.buses.map((b) => [b.id, b]));
  const mappedAfter = new Set([...nodeMap.values(), ...busMap.values()]);

  // ---- 장비
  const onOff = (v: boolean | undefined) => (v ? t("켬", "on") : t("끔", "off"));
  const val = (v: unknown) => (v === undefined || v === "" ? "—" : String(v));
  const pName = (v: string | undefined) => (v === undefined ? "—" : { none: "N", even: "E", odd: "O" }[v] ?? v);
  for (const b of before.nodes) {
    const aid = nodeMap.get(b.id);
    if (!aid) {
      removed.push(b);
      const det: string[] = [tx(NODE_NAME[b.kind], lang)];
      if (b.ip) det.push(`IP ${b.ip}`);
      if (b.unit !== undefined) det.push(t(`국번 ${b.unit}`, `ID ${b.unit}`));
      rows.push({ change: "removed", what: "node", id: b.id, name: nm(b), details: det });
      continue;
    }
    const a = afterNode.get(aid)!;
    const det: string[] = [];
    const cmp = (label: string, x: string, y: string) => {
      if (x !== y) det.push(`${label} ${x} → ${y}`);
    };
    cmp(t("이름", "Name"), val(b.name), val(a.name));
    if (a.kind !== b.kind) det.push(`${t("종류", "Type")} ${tx(NODE_NAME[b.kind], lang)} → ${tx(NODE_NAME[a.kind], lang)}`);
    cmp("IP", val(b.ip), val(a.ip));
    cmp(t("마스크", "Mask"), val(b.mask), val(a.mask));
    cmp(t("국번", "ID"), val(b.unit), val(a.unit));
    cmp(t("보율", "Baud"), val(b.baud), val(a.baud));
    cmp(t("패리티", "Parity"), pName(b.parity), pName(a.parity));
    cmp(t("종단", "Termination"), onOff(b.term), onOff(a.term));
    cmp(t("단위 부하", "Unit load"), fmtUl(b.ul ?? 1), fmtUl(a.ul ?? 1));
    cmp(t("레지스터", "Registers"), val(b.regs), val(a.regs));
    if (det.length) {
      changed.add(a.id);
      rows.push({ change: "changed", what: "node", id: a.id, name: nm(a), details: det });
    }
  }
  for (const a of after.nodes)
    if (!mappedAfter.has(a.id)) {
      added.add(a.id);
      const det: string[] = [tx(NODE_NAME[a.kind], lang)];
      if (a.ip) det.push(`IP ${a.ip}`);
      if (a.unit !== undefined) det.push(t(`국번 ${a.unit}`, `ID ${a.unit}`));
      rows.push({ change: "added", what: "node", id: a.id, name: nm(a), details: det });
    }

  // ---- 버스
  for (const b of before.buses) {
    const aid = busMap.get(b.id);
    if (!aid) {
      rows.push({ change: "removed", what: "bus", id: b.id, name: nm(b), details: [b.kind === "rs485" ? "RS-485" : "CAN"] });
      continue;
    }
    const a = afterBus.get(aid)!;
    const det: string[] = [];
    if (a.name !== b.name) det.push(`${t("이름", "Name")} ${val(b.name)} → ${val(a.name)}`);
    if (a.baud !== b.baud) det.push(`${t("보율", "Baud")} ${val(b.baud)} → ${val(a.baud)}`);
    if (a.parity !== b.parity) det.push(`${t("패리티", "Parity")} ${pName(b.parity)} → ${pName(a.parity)}`);
    if (!!a.termStart !== !!b.termStart) det.push(`${t("왼쪽 끝 종단", "Left-end terminator")} ${onOff(b.termStart)} → ${onOff(a.termStart)}`);
    if (!!a.termEnd !== !!b.termEnd) det.push(`${t("오른쪽 끝 종단", "Right-end terminator")} ${onOff(b.termEnd)} → ${onOff(a.termEnd)}`);
    if (det.length) {
      changed.add(a.id);
      rows.push({ change: "changed", what: "bus", id: a.id, name: nm(a), details: det });
    }
  }
  for (const a of after.buses)
    if (![...busMap.values()].includes(a.id)) {
      added.add(a.id);
      rows.push({ change: "added", what: "bus", id: a.id, name: nm(a), details: [a.kind === "rs485" ? "RS-485" : "CAN"] });
    }

  // ---- 선
  const endName = (doc: SysDoc, id: string) => {
    const n = doc.nodes.find((x) => x.id === id) ?? doc.buses.find((x) => x.id === id);
    return n ? nm(n) : id;
  };
  const key = (kind: string, a: string, b: string) => `${kind}|${[a, b].sort().join("|")}`;
  const afterKeys = new Map(after.links.map((l) => [key(l.kind, l.a, l.b), l]));
  const beforeKeys = new Set<string>();
  const linkText = (doc: SysDoc, l: SysLink) => `${endName(doc, l.a)} — ${endName(doc, l.b)}`;
  for (const l of before.links) {
    const a = mapId(l.a);
    const b = mapId(l.b);
    const k = a && b ? key(l.kind, a, b) : null;
    if (k) beforeKeys.add(k);
    if (!k || !afterKeys.has(k)) rows.push({ change: "removed", what: "link", id: l.id, name: linkText(before, l), details: [l.kind] });
  }
  for (const [k, l] of afterKeys) if (!beforeKeys.has(k)) rows.push({ change: "added", what: "link", id: l.id, name: linkText(after, l), details: [l.kind] });

  // ---- 버스 영향(RS-485)
  const buses: BusImpact[] = [];
  for (const b of before.buses.filter((x) => x.kind === "rs485")) {
    const aid = busMap.get(b.id);
    const a = aid ? afterBus.get(aid)! : null;
    buses.push({ id: a?.id ?? b.id, name: nm(a ?? b), before: busStats(before, b), after: a ? busStats(after, a) : null });
  }
  for (const a of after.buses.filter((x) => x.kind === "rs485" && added.has(x.id))) buses.push({ id: a.id, name: nm(a), before: null, after: busStats(after, a) });

  // ---- 경고
  const sideName = (s: "left" | "right") => (s === "left" ? t("왼쪽", "left") : t("오른쪽", "right"));
  for (const imp of buses) {
    const bs = imp.before;
    const as = imp.after;
    if (bs && as) {
      for (const side of ["left", "right"] as const) {
        const oldEnd = bs[side];
        const newEnd = as[side];
        if (!oldEnd) continue;
        const stillThere = nodeMap.get(oldEnd.id);
        // 끝 장비가 빠짐(문서에서 빠졌거나 버스에서 떨어짐)
        if (!stillThere || !as.devices.some((n) => n.id === stillThere)) {
          if (newEnd && newEnd.id !== stillThere)
            findings.push({
              level: "warn",
              text: t(
                `«${imp.name}» ${sideName(side)} 끝 장비 «${nm(oldEnd)}» 이(가) 빠졌습니다${oldEnd.term ? "(종단 켬이었음)" : ""} — 종단을 새 끝 «${nm(newEnd)}» 로 옮기세요.`,
                `«${imp.name}»: the ${side}-end device «${nm(oldEnd)}» was removed${oldEnd.term ? " (it had termination on)" : ""} — move termination to the new end «${nm(newEnd)}».`,
              ),
              ids: [as.bus.id, newEnd.id],
            });
          continue;
        }
        // 새 장비가 끝 바깥에 붙음
        if (newEnd && added.has(newEnd.id))
          findings.push({
            level: "warn",
            text: t(
              `새 장비 «${nm(newEnd)}» 이(가) «${imp.name}» ${sideName(side)} 끝에 붙었습니다 — 종단을 «${nm(newEnd)}» 로 옮기고 옛 끝 «${nm(oldEnd)}» 의 종단은 끕니다.`,
              `New device «${nm(newEnd)}» is now the ${side} end of «${imp.name}» — move termination to it and switch it off on the old end «${nm(oldEnd)}».`,
            ),
            ids: [as.bus.id, newEnd.id, stillThere],
          });
      }
      if (as.unitLoads > UL_MAX && bs.unitLoads <= UL_MAX)
        findings.push({
          level: "warn",
          text: t(`«${imp.name}» 단위 부하가 ${fmtUl(bs.unitLoads)} → ${fmtUl(as.unitLoads)} 로 32 를 넘었습니다.`, `«${imp.name}» unit loads went from ${fmtUl(bs.unitLoads)} to ${fmtUl(as.unitLoads)}, over 32.`),
          ids: [as.bus.id],
        });
    }
  }
  for (const r of removed) {
    const bits: string[] = [];
    if (r.unit !== undefined) bits.push(t(`국번 ${r.unit} — 마스터 폴링 목록에서 빼고 국번표에 «비어 있음»`, `ID ${r.unit} — remove it from the master's poll list and mark it free`));
    if (r.ip) bits.push(t(`IP ${r.ip} — IP 표·접속 설정에서 정리`, `IP ${r.ip} — clear it from the IP table and client connections`));
    if (bits.length) findings.push({ level: "info", text: t(`«${nm(r)}» 반납: `, `«${nm(r)}» freed: `) + bits.join(" · "), ids: [] });
  }

  return { rows, buses, findings, added, changed, removed, same: rows.length === 0 };
}

/** 글로 — 메신저·보고서에 붙이기 */
export function diffText(d: DocDiff, lang: Lang): string {
  const mark = { added: "+", removed: "−", changed: "~" } as const;
  const lines: string[] = [];
  if (d.same) lines.push(msg(lang, "바뀐 것 없음", "No changes"));
  for (const r of d.rows) lines.push(`${mark[r.change]} ${r.name}${r.details.length ? ` (${r.details.join(", ")})` : ""}`);
  const ms = (s: number) => `${Math.round(s * 1000)} ms`;
  for (const b of d.buses) {
    const f = (st: BusStat | null) => (st ? `${st.devices.length}${msg(lang, "대", "")}·UL ${fmtUl(st.unitLoads)}·${ms(st.cycle)}` : "—");
    lines.push(`${b.name}: ${f(b.before)} → ${f(b.after)}`);
  }
  for (const f of d.findings) lines.push(`${f.level === "info" ? "·" : "⚠"} ${f.text}`);
  return lines.join("\n");
}
