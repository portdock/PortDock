// 포르투갈어(브라질) — Modbus 요청 만들기 창(ModbusBuilder.tsx)·요청과 짝 값(MbValues.tsx)·MBAP 풀이(MbapDetail.tsx)·요청 검사 문구(modbusBuild.ts).
// 원천은 영어판, 빠진 열쇠는 영어로 보인다. 용어는 사이트 pt 와 같게(escravo·holding register·entrada discreta·coil).
import type { MbBuilderTextKey } from "../ModbusBuilder.tsx";
import type { MbValuesTextKey } from "../MbValues.tsx";
import type { MbapTextKey } from "../MbapDetail.tsx";
import type { MbBuildText } from "../modbusBuild.ts";

type Pt<K extends string> = Partial<Record<K, string>>;

export const PT_MB_BUILDER: Pt<MbBuilderTextKey> = {
  title: "Montar requisição Modbus",
  titleTcp: "Montar requisição Modbus TCP",
  slave: "End. do escravo",
  slaveHint: "1–247 (escritas: 0 = broadcast, sem resposta)",
  unitHint: "0–255 — vai no campo Unit ID do MBAP. Em geral 1; o endereço do escravo RTU atrás de um gateway; qualquer valor se o dispositivo o ignora",
  tid: "ID de transação",
  tidHint: "0–65535 — a resposta o repete. Com «ID de transação MBAP automático» ligado na barra de envio, muda a cada envio",
  func: "Função",
  addr: "Endereço inicial",
  zero: "a partir de 0",
  plc: "notação {a}",
  qty: "Quantidade",
  qtyHint: "1–{a}",
  values: "Valores",
  valuesHint: "Separados por vírgula/espaço. Decimal ou hex 0x; negativos permitidos",
  coilsHint: "1 (ON) / 0 (OFF), separados por vírgula/espaço — o primeiro valor é o endereço inicial",
  coil: "Valor",
  on: "ON (FF 00)",
  off: "OFF (00 00)",
  nVals: "{n} valores",
  preview: "Requisição (antes do CRC)",
  previewTcp: "Requisição (cabeçalho MBAP + PDU)",
  crcNote: "+ o CRC16 Modbus de 2 bytes é acrescentado pela barra de envio",
  tcpNote: "O Modbus TCP não tem CRC — enviado como está, sem checksum",
  put: "Pôr na entrada",
  send: "Enviar",
  sendTip: "Envia esta requisição agora (HEX, com CRC16 Modbus, sem fim de linha). Enter nesta janela faz o mesmo",
  toPlc: "Mudar para notação {a}",
  putTip: "Ajusta a barra de envio para HEX, checksum CRC16 Modbus, sem fim de linha, e preenche estes bytes",
  putTipTcp: "Ajusta a barra de envio para HEX, sem checksum, sem fim de linha, e preenche estes bytes",
  add: "Salvar na lista",
  added: "«{a}» adicionado à lista de comandos",
  close: "Fechar",
  bcast: "O escravo 0 escreve em todos os dispositivos; nenhum deles responde.",
  help: "Primeira vez?",
  helpLink: "Ver passo a passo",
  helpTip: "Abre o passo a passo de Modbus na Ajuda (esta janela fecha)",
};

export const PT_MB_VALUES: Pt<Exclude<MbValuesTextKey, "fmts">> = {
  head: "Pareado com a requisição",
  from: "Escravo {u} · {f} · {a} ({n})",
  tid: "transação {t}",
  fmt: "Formato do valor",
  notation: "Endereços",
  zero: "a partir de 0",
  plc: "notação {a}",
  write: "OK — o dispositivo aceitou a escrita",
  exc: "Exceção {a}",
};

export const PT_MBAP: Pt<MbapTextKey> = {
  tid: "ID de transação",
  len: "Campo de comprimento",
  lenBad: "o campo de comprimento não confere",
  unit: "Unit ID (escravo)",
  values: "Valores",
  head: "Modbus TCP",
};

export const PT_MB_BUILD: Partial<MbBuildText> = {
  slave: "O endereço do escravo vai de 1 a 247 (0 = broadcast nas funções de escrita — sem resposta).",
  slaveRead: "Funções de leitura não podem usar o escravo 0 (broadcast) — nenhuma resposta viria. Use 1–247.",
  func: "Função não suportada.",
  addrEmpty: "Informe um endereço.",
  addrNum: "O endereço precisa ser um número (decimal; hex 0x é permitido a partir de 0).",
  addrZero: "O endereço a partir de 0 vai de 0 a 65535.",
  addrPlcLen: "A notação de CLP tem 5 dígitos (ex.: 40001) ou 6 dígitos (ex.: 400001).",
  addrPlcOff: "A notação de CLP conta a partir de 1 (5 dígitos 0001–9999, 6 dígitos 00001–65536).",
  addrPrefix: "«{a}» está na notação {b}. Esta função usa {c}.",
  addrBadPrefix: "O dígito inicial {a} não é notação Modbus (0 coil, 1 entrada discreta, 3 registrador de entrada, 4 holding register).",
  addrPlcNote: "{a} → a partir de 0 {b} (0x{c})",
  addrLooksPlc: "«{a}» parece notação {p}xxxx. Como digitado, é o endereço {a} a partir de 0 (0x{c}) — na notação {p}xxxx é o endereço {b}.",
  qty: "A quantidade vai de 1 a {a} (limite do protocolo).",
  overflow: "O endereço final passa de 65535 (início {a} + quantidade {b}).",
  valEmpty: "Informe o(s) valor(es) a escrever.",
  valBad: "«{a}» não é um valor — use decimal ou hex 0x.",
  valReg: "O valor de registrador «{a}» precisa estar entre -32768 e 65535 (negativos vão em complemento de dois).",
  valCoil: "O valor de coil «{a}» precisa ser 1 (ON) ou 0 (OFF).",
  valOne: "Esta função escreve um único valor.",
  valCount: "{n} valores — esta função aceita de 1 a {a}.",
  plcNames: { "0": "0xxxx (coil)", "1": "1xxxx (entrada discreta, FC02)", "3": "3xxxx (registrador de entrada, FC04)", "4": "4xxxx (holding register, FC03/06/10)" },
};
