// 켤 때 마지막 연결 다시 열기(0.3.0) — 설정 «켤 때 마지막 연결 다시 열기»(기본 끔) 또는 명령줄 --auto.
// 연결(시작)에 성공했을 때의 설정을 «lastConnOk» 에 남기고(앱마다 저장소가 따로), 켤 때 그 설정으로 한 번만 연결한다.
// 포트·장치가 없으면 조용히 그친다(앱이 판단).
import { useEffect, useRef } from "react";
import { load, store } from "./framing";

/** 연결에 성공한 설정 — 앱이 다시 열 때 필요한 것만(포트·속도·주소·방식 등). 화면 칸 값을 그대로 넣어도 된다 */
export function saveLastOk<T>(v: T) {
  store("lastConnOk", v);
}

/** 마지막으로 성공한 설정(없으면 null). 모양은 앱이 다시 확인한다 */
export const loadLastOk = <T,>(): T | null => load<T | null>("lastConnOk", null);

/**
 * want(설정 켬 또는 --auto)이고 ready(포트 목록·명령줄 인자를 다 읽음)가 되면 start 를 한 번 부른다.
 * 첫 ready 때 want 가 아니면 다시 보지 않는다(나중에 설정을 켜도 이번 실행엔 연결하지 않음)
 */
export function useAutoStart(want: boolean, ready: boolean, start: () => void) {
  const done = useRef(false);
  const cur = useRef(start);
  cur.current = start;
  useEffect(() => {
    if (done.current || !ready) return;
    done.current = true;
    if (want) cur.current();
  }, [want, ready]);
}
