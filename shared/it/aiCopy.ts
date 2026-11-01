// 이탈리아어 — «Copia per chiedere a un’IA» 의 질문 틀·머리말(aiCopy.ts). 원천은 영어판. 붙여 넣는 글이라 화면 언어를 따른다.
import type { AiText } from "../aiCopy.ts";

type HideIp = "public" | "all";

export const IT_AI_COPY: Partial<AiText> = {
  ask: (app: string) => `Di seguito un log di ${app}. Elenca le cause probabili del problema e l’ordine in cui verificarle.`,
  ask2: "Indica se guardare prima le impostazioni del dispositivo, il cablaggio o il PC, e cita le righe del log che lo supportano. Se non sei sicuro, dimmi cos’altro controllare.",
  situation: "## Situazione (da compilare dopo aver incollato)",
  situationLines: ["- Cosa stavo cercando di fare:", "- Risultato atteso / ottenuto:", "- Dispositivo (produttore, modello) e connessione:"],
  kinds: {
    pc: {
      ask: (app: string) => `Di seguito i risultati del controllo PC di ${app}. Elenca le cause probabili del problema e l’ordine in cui verificarle.`,
      ask2: "Indica se guardare prima le impostazioni del PC, i driver, l’ambiente wireless (Wi-Fi, Bluetooth) o il router, e cita le righe che lo supportano. Se non sei sicuro, dimmi cos’altro controllare.",
      situationLines: ["- Cosa stavo cercando di fare:", "- Risultato atteso / ottenuto:", "- PC e wireless (portatile/fisso, cablato/wireless, modello di router o dispositivo):"],
    },
    scan: {
      ask: (app: string) => `Di seguito l’elenco dei dispositivi di rete trovati da ${app}. Aiutami a trovare il dispositivo che cerco, o a capire perché non compare.`,
      ask2: "Indica se guardare prima l’intervallo di indirizzi (subnet), le impostazioni IP del dispositivo, la scheda di rete o lo switch, e cita le righe che lo supportano. Se non sei sicuro, dimmi cos’altro controllare.",
      situationLines: ["- Dispositivo cercato (produttore, modello, IP noto):", "- Risultato atteso / ottenuto:", "- Collegamento PC–dispositivo (diretto, switch, rete di stabilimento):"],
    },
    port: {
      ask: (app: string) => `Di seguito i risultati del controllo porte di ${app}. Elenca le cause probabili del problema e l’ordine in cui verificarle.`,
      ask2: "Indica se guardare prima il numero di porta, il driver, l’adattatore USB o le impostazioni di risparmio energetico, e cita le righe che lo supportano. Se non sei sicuro, dimmi cos’altro controllare.",
      situationLines: ["- Cosa stavo cercando di fare:", "- Risultato atteso / ottenuto:", "- Adattatore o dispositivo (produttore, modello) e porta USB usata:"],
    },
  },
  found: "## Dispositivi trovati",
  program: "## Programma",
  state: "Stato attuale",
  settings: "## Impostazioni di connessione",
  errors: (n: number) => `## Errori di questa sessione (${n})`,
  checks: "## Risultati del controllo",
  log: (n: number) => `## Traffico recente (${n} righe)`,
  logFormat: "Formato: ora direzione [peer] HEX | testo | nota aggiunta dal programma",
  logEmpty: "(nessun traffico)",
  cutLines: (n: number, max: number) => `(${n} righe vecchie rimosse per stare in ${max.toLocaleString("en-US")} caratteri)`,
  cutText: "…(tagliato — troppo lungo)",
  masked: (ip: HideIp) => `_Nascosto da PortDock: cartella utente, nome del PC (DESKTOP-… ecc.), ultimi 3 byte degli indirizzi MAC, ${ip === "all" ? "tutti gli indirizzi IP" : "indirizzi IP pubblici"} («[IP-n]»)._`,
};
