// 연결·기록 중 절전 막기(0.3.0) — 설정 «연결·기록 중 절전 막기»(기본 끔)가 켜져 있고 연결(시작)·파일 기록 중이면
// 백엔드 keep_awake(true)(crates/core/src/power.rs — PC 대기만 막고 화면은 꺼져도 됨), 끊거나 창을 닫으면 false.
import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useKeepAwake(active: boolean, on: boolean) {
  const want = active && on;
  useEffect(() => {
    invoke("keep_awake", { on: want }).catch(() => {});
  }, [want]);
  // 창을 닫을 때·화면이 다시 읽힐 때 풀기(프로세스가 끝나면 Windows 도 푼다)
  useEffect(() => {
    const off = () => void invoke("keep_awake", { on: false }).catch(() => {});
    window.addEventListener("pagehide", off);
    return () => {
      window.removeEventListener("pagehide", off);
      off();
    };
  }, []);
}
