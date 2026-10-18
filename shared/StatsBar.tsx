// 처리량(1초 창)·프레임 수·«마지막 수신 n초 전», 간격 열 고르기 — Serial·TCP·UDP 공통 화면 조각.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { fmtAgo, fmtRate, type DeltaMode, type Meter } from "./liveStats";
import { tip } from "./tips";
import { io } from "./ioText";
import type { Lang } from "./uiText";
import { Popover } from "./Popover";
import "./io.css";

/** 1초마다 스스로 다시 그린다(앱 전체를 다시 그리지 않게) */
export function LiveStats({ meter, lang, active }: { meter: Meter; lang: Lang; active: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const r = meter.rate(now);
  // 오래 조용하면(10초+) 눈에 띄게 — 장비가 멈춘 것을 알아채도록
  const quiet = active && meter.lastRx != null && now - meter.lastRx > 10_000;
  return (
    <span className="live-stats mono" data-tip={tip(lang, "liveStats")}>
      <span className={r.rx ? "on" : ""}>{io(lang, "rateRx", { a: fmtRate(r.rx) })}</span>
      <span className={r.tx ? "on" : ""}>{io(lang, "rateTx", { a: fmtRate(r.tx) })}</span>
      <span>{io(lang, "framesCount", { a: meter.frames.rx.toLocaleString(), b: meter.frames.tx.toLocaleString() })}</span>
      <span className={quiet ? "quiet" : ""}>{io(lang, "lastRx", { a: fmtAgo(meter.lastRx, now, lang) })}</span>
    </span>
  );
}

export function DeltaSelect({ lang, value, onChange }: { lang: Lang; value: DeltaMode; onChange: (m: DeltaMode) => void }) {
  return (
    <select className="delta-sel" value={value} onChange={(e) => onChange(e.target.value as DeltaMode)} data-tip={tip(lang, "delta")} aria-label={io(lang, "delta")}>
      <option value="off">{io(lang, "deltaOff")}</option>
      <option value="prev">{io(lang, "deltaPrev")}</option>
      <option value="resp">{io(lang, "deltaResp")}</option>
    </select>
  );
}

/**
 * 도구줄 «보기 설정» — 가끔 바꾸는 보기 옵션(시간 간격 열 등)을 작은 띄움 칸에 모아 도구줄을 한 줄로 둔다.
 * 간격 열이 켜져 있으면 버튼에 표시한다. children 은 앱마다 더하는 칸.
 */
export function ViewOptions({ lang, delta, onDelta, children }: { lang: Lang; delta: DeltaMode; onDelta: (m: DeltaMode) => void; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={btn}
        type="button"
        className={delta !== "off" ? "btn small view-opt-btn on" : "btn small view-opt-btn"}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        data-tip={tip(lang, "viewOpts")}
      >
        {io(lang, "viewOpts")} ▾
      </button>
      {open && (
        <Popover anchor={btn.current} onClose={() => setOpen(false)} label={io(lang, "viewOpts")} className="view-pop">
          <label className="pop-row" data-tip={tip(lang, "delta")}>
            {io(lang, "deltaCol")}
            <DeltaSelect lang={lang} value={delta} onChange={onDelta} />
          </label>
          {children}
        </Popover>
      )}
    </>
  );
}
