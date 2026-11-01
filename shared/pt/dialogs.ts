// 포르투갈어(브라질) — 공용 창: 장비 프로필(DeviceDialog)·연결 점검(PortCheckDialog)·연결 시험(LoopbackPanel)·랜카드 주소 목록(NetIfaces)·
// 다른 앱 열기 알림(openApp)·닫기 확인(exitGuard)·예시 명령(examples). 원천은 영어판, 빠진 열쇠는 영어로 보인다.
import type { DeviceTextKey } from "../DeviceDialog.tsx";
import type { PortCheckTextKey } from "../PortCheckDialog.tsx";
import type { LoopTextKey } from "../LoopbackPanel.tsx";
import type { IfaceTextKey } from "../NetIfaces.tsx";
import type { OpenAppTextKey } from "../openApp.ts";

type Pt<K extends string> = Partial<Record<K, string>>;

export const PT_DEVICE: Pt<DeviceTextKey> = {
  masterTitle: "Carregar perfil de dispositivo",
  slaveTitle: "Carregar emulação de dispositivo",
  search: "Buscar (fabricante, modelo, tipo)",
  none: "Nenhum dispositivo encontrado",
  close: "Fechar",
  cancel: "Cancelar",
  apply: "Carregar",
  regs: "{n} registradores",
  comm: "Comunicação padrão",
  commOpt: "Aplicar também a configuração serial (baud rate, dados, paridade, stop)",
  commNone: "Nenhuma configuração de comunicação padrão confirmada no manual",
  gapOpt: "Ler registradores com pequenos vãos numa só tabela (até {n} — desligue se o dispositivo recusar endereços não usados)",
  masterPlan: "Adiciona {n} tabelas de leitura (escravo {u}): {a}",
  masterSkip: "{n} registradores só de escrita não são lidos",
  slavePlan: "Preenche nomes, tipos e valores de exemplo no escravo atual {u}. As faixas de resposta crescem se preciso.",
  slaveUnit: "O endereço de escravo padrão deste dispositivo é {u}",
  sources: "Fontes",
  caution: "Fatos tirados do manual do fabricante (sem vínculo com o fabricante). Podem mudar conforme o firmware ou o modelo — confira o manual do dispositivo antes de escrever.",
  thAddr: "Endereço (manual)",
  thName: "Nome",
  thType: "Tipo",
  thUnit: "Unidade",
  thRw: "L/E",
  notes: "Notas",
  behaveOpt: "Adicionar também geradores de valor e regras de ligação — oscilação de tensão/corrente, acúmulo de energia, comando de partida → rampa da frequência de saída",
  guardOpt: "Respeitar somente leitura e somente escrita",
  slaveNote: "Estes valores vêm das tabelas do manual — o comportamento do dispositivo real (tempos de rampa etc.) pode ser diferente.",
};

export const PT_PORTCHECK: Pt<PortCheckTextKey> = {
  title: "Verificar conexão",
  close: "Fechar (Esc)",
  reading: "Lendo…",
  readFail: "Não foi possível ler",
  device: "Dispositivo e driver",
  settings: "Configurações",
  power: "Economia de energia",
  test: "Teste de conexão",
  cannot: "O que o PC não vê",
  guides: "Guias:",
  name: "Nome",
  chip: "VID:PID · chip",
  driver: "Driver",
  problem: "Código de problema",
  action: "O que tentar",
  latency: "Latency timer FTDI",
  suspend: "Suspensão seletiva USB",
  canOff: "O PC pode desligá-lo",
  on: "ligado",
  off: "desligado",
  connected: "Desconecte antes de rodar o teste (ele mesmo abre a porta).",
  copy: "Copiar texto",
  copied: "Copiado",
  more: "Para histórico de drivers, reservas de número COM e dispositivos ocultos, use o PortDock Port Inspector.",
  readOnly: "Somente leitura, sem direitos de administrador.",
};

export const PT_LOOP: Pt<LoopTextKey> = {
  mode: "Teste",
  loop: "Loopback — TX ligado ao RX",
  loopHint: "Num DB9, ligue o pino 2 (RX) ao pino 3 (TX); num adaptador TTL, ligue TX a RX. Verifica se os bytes voltam sem mudança em cada velocidade e mede a ida e volta de 1 byte.",
  two: "Duas portas — dois adaptadores ligados entre si",
  twoHint: "Com dois adaptadores/cabos ligados entre si, envia desta porta → a outra e da outra → esta em cada velocidade e compara o que chega. Útil para conferir adaptadores RS-485.",
  peer: "Outra porta",
  peerNone: "Nenhuma outra porta",
  pattern: "Padrão",
  patRandom: "Bytes variados",
  patRamp: "0x00–0xFF em ordem",
  patAlt: "0x55/0xAA alternados",
  length: "Tamanho (bytes)",
  wiring: "Como ligar",
  overall: "Geral",
  colDir: "Sentido",
  echo: "Eco RS-485 a 2 fios",
  echoHint: "Sem dispositivo no barramento, verifica se o adaptador recebe os bytes que envia.",
  bauds: "Velocidades",
  more: "Mais velocidades",
  start: "Iniciar teste",
  cancel: "Parar",
  sure: "O dispositivo está desconectado da linha/barramento? Os bytes de teste podem chegar a um dispositivo como comandos.",
  sureYes: "Desconectado — iniciar",
  sureNo: "Cancelar",
  running: "Testando",
  noPort: "Escolha uma porta primeiro.",
  colBaud: "Velocidade",
  colResult: "Resultado",
  colBytes: "Enviados · iguais · perdidos · alterados",
  colRtt: "Ida e volta de 1 byte ms (mediana · máx.)",
  colFlags: "Sinais de erro",
  flagsNone: "nenhum",
  flagsUnread: "não lido",
  flagFrame: "enquadramento",
  flagParity: "paridade",
  flagOverrun: "overrun",
  flagRxOver: "estouro de buffer",
  flagsNote: "Os sinais de erro só aparecem quando o driver os levanta — «nenhum» não garante que não houve erros. O tempo de ida e volta inclui a latência USB, o driver e o tempo do programa.",
  echoBack: "Bytes de volta",
  firstMs: "Primeiro byte após",
};

/** Desenho da ligação (em texto) */
export const PT_WIRING: Partial<Record<"loopback" | "two" | "echo", string>> = {
  loopback: ["RS-232 (DB9, macho ou fêmea)", "  pino 2 (RX) ──┐", "  pino 3 (TX) ──┘   ligar o pino 2 ao pino 3", "", "Adaptador TTL", "  TX ──┐", "  RX ──┘   ligar TX a RX", "", "RS-485 não faz loopback numa porta só — escolha «Duas portas»."].join("\n"),
  two: ["RS-232 (cruzado, null modem)", "  porta A        porta B", "  pino 2 RX ──── pino 3 TX", "  pino 3 TX ──── pino 2 RX", "  pino 5 GND ─── pino 5 GND", "", "RS-485 (2 fios)", "  A(D+) ─────── A(D+)", "  B(D−) ─────── B(D−)", "  GND ──────── GND"].join("\n"),
  echo: ["Um adaptador RS-485 — com o dispositivo fora do barramento", "  A(D+)  B(D−)  nada conectado"].join("\n"),
};

export const PT_IFACE: Pt<IfaceTextKey> = {
  title: "Este PC",
  all: "todos os adaptadores",
  local: "só este PC",
  down: "não conectado",
  none: "Não foi possível ler os endereços dos adaptadores",
  refresh: "Recarregar",
  use: "Usar este endereço",
  gw: "gateway",
  notHere: "«{a}» não é um endereço deste PC — iniciar vai falhar com «endereço não disponível». Escolha um na lista abaixo.",
  downHere: "O adaptador de «{a}» ({b}) não está conectado (confira o cabo / Wi-Fi).",
};

export const PT_OPEN_APP: Pt<OpenAppTextKey> = {
  opened: "{a} aberto — {b}. Clique em conectar naquela janela.",
  missing: "{a} não foi encontrado neste PC, então «{b}» foi copiado — cole lá.",
  get: "Página de download",
};

/** Confirmação ao fechar (exitGuard.ts) */
export const PT_EXIT = "Há uma conexão ou um log em arquivo ativo. Fechar vai desconectar e parar o log. Fechar mesmo assim?";

/** Comandos de exemplo (examples.ts) — prefixo do nome e nome em inglês → nome em português */
export const PT_EXAMPLE_PREFIX = "ex. ";
export const PT_EXAMPLES: Record<string, string> = {
  "AT (check reply)": "AT (conferir resposta)",
  "ATI (device info)": "ATI (info do dispositivo)",
  "AT+GMR (firmware version)": "AT+GMR (versão do firmware)",
  "Modbus Slave ID 1 read 40001–40010 (FC03)": "Modbus escravo 1 ler 40001–40010 (FC03)",
  "Modbus Slave ID 1 read 30001–30002 (FC04)": "Modbus escravo 1 ler 30001–30002 (FC04)",
  "*IDN? (SCPI instrument ID)": "*IDN? (identificação do instrumento SCPI)",
  "Modbus TCP Slave ID 1 read 40001–40010 (FC03)": "Modbus TCP escravo 1 ler 40001–40010 (FC03)",
  "Modbus TCP Slave ID 1 read 30001–30002 (FC04)": "Modbus TCP escravo 1 ler 30001–30002 (FC04)",
  "HTTP request for the home page (port 80)": "HTTP pedido da página inicial (porta 80)",
  "text hello": "texto hello",
  "HEX 01 02 03 04": "HEX 01 02 03 04",
  "*IDN? (instrument ID)": "*IDN? (identificação do instrumento)",
  "MEAS:VOLT:DC? (DC voltage)": "MEAS:VOLT:DC? (tensão DC)",
  "SYST:ERR? (one error)": "SYST:ERR? (um erro)",
};
