// 백엔드(apps/port-inspector/src-tauri/src/lib.rs) 명령 — 모양은 shared/portinfo.ts
import { Channel, invoke } from "@tauri-apps/api/core";
import type { ComNumbers, EventList, LoopConfig, LoopEvent, NicList, PortEntry, PortReport } from "@shared/portinfo";
import type { LoopApi } from "@shared/LoopbackPanel";
import type { PcCheck } from "@shared/pcCheck";
import type { Wireless } from "@shared/wireless";
import { tally } from "@shared/usage";

export const api = {
  list: (hidden: boolean) => invoke<PortEntry[]>("pi_list", { hidden }),
  report: (id: string) => tally("port_report", invoke<PortReport>("pi_report", { id })),
  comNumbers: () => tally("com_numbers", invoke<ComNumbers>("pi_com_numbers")),
  events: (instanceId: string, days: number) => tally("events", invoke<EventList>("pi_events", { instanceId, days })),
  nics: () => tally("nics", invoke<NicList>("pi_nics")),
  pc: (days: number) => tally("pc_check", invoke<PcCheck>("pi_pc", { days })),
  wireless: (days: number) => tally("wireless", invoke<Wireless>("pi_wireless", { days })),
  writeText: (path: string, text: string) => invoke<void>("write_text", { path, text }),
  readText: (path: string) => invoke<string>("read_text", { path }),
};

export const loopApi: LoopApi = {
  start: (config: LoopConfig, onEvent: (e: LoopEvent) => void) => {
    const ch = new Channel<LoopEvent>();
    ch.onmessage = onEvent;
    return tally("loopback", invoke<void>("loop_start", { config, onEvent: ch }));
  },
  cancel: () => invoke<void>("loop_cancel"),
};
