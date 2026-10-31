// 백엔드(apps/hw-tester/src-tauri/src/lib.rs) 명령 — 모양은 model.ts
import { Channel, invoke } from "@tauri-apps/api/core";
import { tally } from "@shared/usage";
import type { BtAudioState, BtEvent, RecConfig, RecEvent, UsbEvent, UsbHistory, WifiSignal } from "./model";

export const api = {
  recStart: (config: RecConfig, onEvent: (e: RecEvent) => void) => {
    const ch = new Channel<RecEvent>();
    ch.onmessage = onEvent;
    return tally("net_record", invoke<void>("rec_start", { config, onEvent: ch }));
  },
  recStop: () => invoke<void>("rec_stop"),
  btStart: (onEvent: (e: BtEvent) => void) => {
    const ch = new Channel<BtEvent>();
    ch.onmessage = onEvent;
    return tally("bt_record", invoke<void>("bt_start", { onEvent: ch }));
  },
  btStop: () => invoke<void>("bt_stop"),
  usbStart: (onEvent: (e: UsbEvent) => void) => {
    const ch = new Channel<UsbEvent>();
    ch.onmessage = onEvent;
    return tally("usb_record", invoke<void>("usb_start", { onEvent: ch }));
  },
  usbStop: () => invoke<void>("usb_stop"),
  usbHistory: (days: number) => tally("usb_history", invoke<UsbHistory>("usb_history", { days })),
  wifiSignal: () => invoke<WifiSignal>("wifi_signal"),
  btAudio: () => tally("bt_audio", invoke<BtAudioState>("bt_audio")),
  keepAwake: (on: boolean) => invoke<boolean>("keep_awake", { on }),
  writeText: (path: string, text: string) => invoke<void>("write_text", { path, text }),
  readText: (path: string) => invoke<string>("read_text", { path }),
};
