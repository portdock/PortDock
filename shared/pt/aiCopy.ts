// 포르투갈어(브라질) — «AI 복사» 의 질문 틀·머리말(aiCopy.ts). 원천은 영어판. 붙여 넣는 글이라 화면 언어를 따른다.
import type { AiText } from "../aiCopy.ts";

type HideIp = "public" | "all";

export const PT_AI_COPY: Partial<AiText> = {
  ask: (app: string) => `Abaixo está um log do ${app}. Liste as causas prováveis do problema e a ordem em que verificá-las.`,
  ask2: "Diga se devo olhar primeiro as configurações do dispositivo, a fiação ou o PC, e aponte as linhas do log que sustentam isso. Se não tiver certeza, diga o que mais devo verificar.",
  situation: "## Situação (preencha depois de colar)",
  situationLines: ["- O que eu tentava fazer:", "- Resultado esperado / real:", "- Dispositivo (fabricante, modelo) e conexão:"],
  kinds: {
    pc: {
      ask: (app: string) => `Abaixo estão os resultados da verificação do PC feita pelo ${app}. Liste as causas prováveis do problema e a ordem em que verificá-las.`,
      ask2: "Diga se devo olhar primeiro as configurações do PC, os drivers, o ambiente sem fio (Wi-Fi, Bluetooth) ou o roteador, e aponte as linhas que sustentam isso. Se não tiver certeza, diga o que mais devo verificar.",
      situationLines: ["- O que eu tentava fazer:", "- Resultado esperado / real:", "- PC e rede sem fio (notebook/desktop, cabo/sem fio, modelo do roteador ou dispositivo):"],
    },
    scan: {
      ask: (app: string) => `Abaixo está a lista de dispositivos de rede encontrados pelo ${app}. Ajude-me a achar o dispositivo que procuro, ou por que ele não aparece.`,
      ask2: "Diga se devo olhar primeiro a faixa de endereços (sub-rede), as configurações de IP do dispositivo, a placa de rede ou o switch, e aponte as linhas que sustentam isso. Se não tiver certeza, diga o que mais devo verificar.",
      situationLines: ["- Dispositivo que eu procurava (fabricante, modelo, IP conhecido):", "- Resultado esperado / real:", "- Como o PC e o dispositivo estão ligados (direto, switch, rede da fábrica):"],
    },
    port: {
      ask: (app: string) => `Abaixo estão os resultados da verificação de portas feita pelo ${app}. Liste as causas prováveis do problema e a ordem em que verificá-las.`,
      ask2: "Diga se devo olhar primeiro o número da porta, o driver, o adaptador USB ou as configurações de economia de energia, e aponte as linhas que sustentam isso. Se não tiver certeza, diga o que mais devo verificar.",
      situationLines: ["- O que eu tentava fazer:", "- Resultado esperado / real:", "- Adaptador ou dispositivo (fabricante, modelo) e porta USB usada:"],
    },
  },
  found: "## Dispositivos encontrados",
  program: "## Programa",
  state: "Estado atual",
  settings: "## Configurações de conexão",
  errors: (n: number) => `## Erros nesta sessão (${n})`,
  checks: "## Resultados da verificação",
  log: (n: number) => `## Tráfego recente (${n} linhas)`,
  logFormat: "Formato: hora sentido [par] HEX | texto | nota acrescentada pelo programa",
  logEmpty: "(sem tráfego)",
  cutLines: (n: number, max: number) => `(${n} linhas antigas removidas para caber em ${max.toLocaleString("en-US")} caracteres)`,
  cutText: "…(cortado — longo demais)",
  masked: (ip: HideIp) => `_Ocultado pelo PortDock: pasta do usuário, nome do PC (DESKTOP-… etc.), últimos 3 bytes dos endereços MAC, ${ip === "all" ? "todos os endereços IP" : "endereços IP públicos"} («[IP-n]»)._`,
};
