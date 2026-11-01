// 독일어 — «Kopie für KI-Fragen» 의 질문 틀·머리말(aiCopy.ts). 원천은 영어판. 붙여 넣는 글이라 화면 언어를 따른다.
import type { AiText } from "../aiCopy.ts";

type HideIp = "public" | "all";

export const DE_AI_COPY: Partial<AiText> = {
  ask: (app: string) => `Unten steht ein Log aus ${app}. Bitte nennen Sie mögliche Ursachen des Problems und die Reihenfolge, in der ich sie prüfen sollte.`,
  ask2: "Sagen Sie, ob ich zuerst die Geräteeinstellungen, die Verdrahtung oder den PC prüfen sollte, und nennen Sie die Logzeilen, die das stützen. Wenn unklar, sagen Sie mir, was ich noch prüfen sollte.",
  situation: "## Situation (nach dem Einfügen ausfüllen)",
  situationLines: ["- Was ich tun wollte:", "- Erwartetes / tatsächliches Ergebnis:", "- Gerät (Hersteller, Typ) und Verbindung:"],
  kinds: {
    pc: {
      ask: (app: string) => `Unten stehen PC-Prüfergebnisse aus ${app}. Bitte nennen Sie mögliche Ursachen des Problems und die Reihenfolge, in der ich sie prüfen sollte.`,
      ask2: "Sagen Sie, ob ich zuerst PC-Einstellungen, Treiber, die Funkumgebung (WLAN, Bluetooth) oder den Router prüfen sollte, und nennen Sie die Zeilen, die das stützen. Wenn unklar, sagen Sie mir, was ich noch prüfen sollte.",
      situationLines: ["- Was ich tun wollte:", "- Erwartetes / tatsächliches Ergebnis:", "- PC und Funkumgebung (Laptop/Desktop, LAN/WLAN, Router- oder Gerätetyp):"],
    },
    scan: {
      ask: (app: string) => `Unten steht die Liste der Netzwerkgeräte, die ${app} gefunden hat. Bitte helfen Sie mir, das gesuchte Gerät zu finden oder zu verstehen, warum es nicht erscheint.`,
      ask2: "Sagen Sie, ob ich zuerst den Adressbereich (Subnetz), die IP-Einstellungen des Geräts, den Netzwerkadapter oder den Switch prüfen sollte, und nennen Sie die Zeilen, die das stützen. Wenn unklar, sagen Sie mir, was ich noch prüfen sollte.",
      situationLines: ["- Gesuchtes Gerät (Hersteller, Typ, bekannte IP):", "- Erwartetes / tatsächliches Ergebnis:", "- Verbindung von PC und Gerät (direkt, Switch, Anlagennetz):"],
    },
    port: {
      ask: (app: string) => `Unten stehen Port-Prüfergebnisse aus ${app}. Bitte nennen Sie mögliche Ursachen des Problems und die Reihenfolge, in der ich sie prüfen sollte.`,
      ask2: "Sagen Sie, ob ich zuerst die Portnummer, den Treiber, den USB-Adapter oder die Energiespareinstellungen prüfen sollte, und nennen Sie die Zeilen, die das stützen. Wenn unklar, sagen Sie mir, was ich noch prüfen sollte.",
      situationLines: ["- Was ich tun wollte:", "- Erwartetes / tatsächliches Ergebnis:", "- Adapter oder Gerät (Hersteller, Typ) und verwendeter USB-Anschluss:"],
    },
  },
  found: "## Gefundene Geräte",
  program: "## Programm",
  state: "Aktueller Zustand",
  settings: "## Verbindungseinstellungen",
  errors: (n: number) => `## Fehler in dieser Sitzung (${n})`,
  checks: "## Prüfergebnisse",
  log: (n: number) => `## Letzter Datenverkehr (${n} Zeilen)`,
  logFormat: "Format: Zeit Richtung [Gegenstelle] HEX | Text | Anmerkung des Programms",
  logEmpty: "(kein Datenverkehr)",
  cutLines: (n: number, max: number) => `(${n} ältere Zeilen entfernt, um in ${max.toLocaleString("de-DE")} Zeichen zu passen)`,
  cutText: "…(gekürzt — zu lang)",
  masked: (ip: HideIp) => `_Von PortDock verborgen: Benutzerordner, PC-Name (DESKTOP-… usw.), letzte 3 Bytes von MAC-Adressen, ${ip === "all" ? "alle IP-Adressen" : "öffentliche IP-Adressen"} («[IP-n]»)._`,
};
