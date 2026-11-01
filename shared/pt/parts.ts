// 포르투갈어(브라질) — 공용 부품의 화면 글(설정 창·도움말 머리·문제 보고·AI 복사 창·첫 실행 카드·새 버전 알림·로그 찾기·화면 오류·사용 통계).
// 원천은 각 부품의 영어판. 빠진 열쇠는 영어로 보인다. 단추 글은 좁은 창에 맞게 짧게.
import type { SettingsTextKey } from "../SettingsDialog.tsx";
import type { HelpUiKey } from "../HelpDialog.tsx";
import type { ReportTextKey } from "../ReportDialog.tsx";
import type { AiUiKey } from "../AiCopyButton.tsx";
import type { FirstTextKey } from "../FirstCard.tsx";
import type { UpdateTextKey } from "../UpdateNotice.tsx";
import type { FilterTextKey } from "../LogFilter.tsx";
import type { BoundaryTextKey } from "../Boundary.tsx";
import type { UsageText } from "../usageText.ts";

type Pt<K extends string> = Partial<Record<K, string>>;

export const PT_SETTINGS: Pt<SettingsTextKey> = {
  title: "Configurações",
  lang: "Idioma",
  theme: "Tema",
  system: "Seguir o Windows",
  light: "Claro",
  dark: "Escuro",
  fontSize: "Tamanho da fonte (px)",
  timeFormat: "Hora no log",
  local: "hh:mm:ss.ms",
  localDate: "Data + hora",
  utc: "UTC",
  elapsed: "Tempo desde o início (Limpar zera)",
  maxLines: "Linhas mantidas na tela",
  maxLinesHint: "As linhas antigas saem só da tela (os logs em arquivo guardam tudo).",
  autoScroll: "Rolar automaticamente com novas linhas (pausa ao rolar para cima)",
  alwaysOnTop: "Sempre visível — manter esta janela sobre as outras (📌 no cabeçalho)",
  expandAll: "Expandir tudo (visão avançada) — mostrar sempre abertos os grupos recolhidos (conexão avançada, recepção, injeção de falhas, estatísticas …)",
  autoLog: "Gravar em arquivo ao conectar",
  logFolder: "Pasta da gravação automática",
  choose: "Escolher",
  noFolder: "Escolha uma pasta",
  confirmExit: "Perguntar antes de fechar se estiver conectado ou gravando",
  lostAlert: "Piscar o botão na barra de tarefas quando a conexão cair (com a janela em segundo plano)",
  keepAwake: "Manter o PC acordado enquanto conectado ou gravando (a tela ainda pode desligar)",
  autoConnect: "Reabrir a última conexão ao iniciar",
  autoReport: "Relatórios de erro automáticos",
  arAsk: "Perguntar após um travamento",
  arOn: "Enviar automaticamente",
  arOff: "Nunca enviar",
  autoReportHint: "Envia só a causa dos erros do programa (exceções, travamentos) e a versão do programa/Windows. Tráfego, comandos, regras e configurações de IP nunca são enviados. PCs sem internet tentam de novo na próxima vez.",
  backup: "Backup",
  exportAll: "Exportar configurações",
  importAll: "Importar configurações",
  reset: "Restaurar padrões",
  resetAsk: "Restaurar as configurações de exibição para o padrão? (comandos e regras são mantidos)",
  importAsk: "Importar substitui todas as configurações, comandos e regras atuais. Continuar?",
  importBusy: "Pare a conexão e a gravação antes de importar.",
  noFolderWarn: "A gravação automática não começa até que uma pasta seja escolhida.",
  close: "Fechar",
  about: "Sobre",
  gpl: "Este programa é software livre, distribuído sob a GNU GPL v3. Vem SEM NENHUMA GARANTIA.",
  license: "Texto da licença",
  source: "Código-fonte",
  site: "Site",
  notices: "Avisos de terceiros",
  sponsor: "Apoiar",
  checkUpdate: "Verificar atualizações",
  checkUpdateHint: "Abre no navegador a página da versão mais recente.",
  updateCheck: "Verificar novas versões (uma vez por dia)",
  updateCheckHint: "Quando ligado, pergunta ao GitHub (api.github.com) uma vez por dia só pela versão mais recente e mostra um aviso no rodapé da janela se houver uma mais nova. Nenhum dado é enviado; nada é baixado nem instalado.",
};

export const PT_HELP_UI: Pt<HelpUiKey> = {
  title: "Ajuda",
  search: "Pesquisar…",
  close: "Fechar",
  none: "Nenhum resultado",
  enOnly: "A ajuda está só em inglês (a interface está em português).",
};

export const PT_REPORT: Pt<ReportTextKey> = {
  button: "Relatar um problema — enviar erros e falhas ao desenvolvedor",
  title: "Relatar um problema",
  intro: "Um relatório é montado neste PC e exibido abaixo. Nada é enviado automaticamente. Revise e escolha como enviar.",
  what: "O que aconteceu? (o que você fazia, onde clicou, resultado esperado vs. real)",
  whatPh: "ex.: A janela travou quando um terceiro par conectou ao servidor TCP.",
  env: "Versão do programa e do Windows (sempre incluída)",
  errors: "{n} erro(s) nesta sessão",
  crashes: "{n} registro(s) de travamento",
  dumps: "Arquivo de dump incluído ({n} KB)",
  dumpsSend: " — enviado com «Enviar agora»",
  dumpManual: "Anexe você mesmo o arquivo de dump ao enviar por e-mail ou GitHub (mantido até ser enviado ou descartado): {a}",
  config: "Configurações de conexão e exibição (IP, porta, baud rate … — comandos e regras não são incluídos)",
  log: "Últimas {n} linhas de tráfego",
  logWarn: "O tráfego pode conter dados da empresa ou do dispositivo. Inclua só se for permitido.",
  preview: "Prévia do relatório",
  copy: "Copiar",
  copied: "Copiado",
  saveFile: "Salvar em arquivo",
  saved: "Salvo: {a}",
  email: "Enviar por e-mail",
  emailHint: "Seu programa de e-mail abre. Relatórios longos são cortados, então anexe o arquivo de «Salvar em arquivo».",
  issue: "Abrir uma issue no GitHub",
  issueHint: "Publicado publicamente no GitHub (exige conta). Confira se não há dados da empresa.",
  offline: "Num PC sem internet, use «Salvar em arquivo», passe por USB e envie de outro PC.",
  close: "Fechar",
  crashTitle: "O programa travou da última vez",
  crashBody: "{a} fechou inesperadamente da última vez e deixou um registro. Enviá-lo ao desenvolvedor ajuda muito.",
  crashOpen: "Ver relatório",
  crashLater: "Depois",
  crashDiscard: "Descartar sem enviar",
  noTarget: "Nenhum destino configurado ainda. Use «Salvar em arquivo».",
  sendNow: "Enviar agora",
  sendNowHint: "Envia a prévia acima direto ao desenvolvedor (exige internet, não exige conta).",
  sending: "Enviando…",
  sentOk: "Enviado. Obrigado!",
  sendFail: "Não foi possível enviar (confira a conexão com a internet). Use «Salvar em arquivo» e envie depois.",
  crashSend: "Enviar agora",
  crashAlways: "De agora em diante, enviar automaticamente sem perguntar",
};

export const PT_AI_UI: Pt<AiUiKey> = {
  button: "Perguntar à IA — só copia, nada é enviado: a situação atual como texto para um chat de IA, na área de transferência",
  title: "Copiar para perguntar à IA",
  introLog: "Monta um texto para um chat de IA (com modelo de pergunta): programa, configurações de conexão, erros desta sessão e tráfego recente.",
  introChecks: "Monta um texto para um chat de IA (com modelo de pergunta): programa, erros desta sessão e resultados da verificação.",
  local: "O PortDock não envia nada a lugar nenhum — vai só para a área de transferência.",
  warn: "O que você colar vai para esse serviço de IA. Confira os dados do dispositivo e da empresa antes de colar.",
  hideIp: "Ocultar também IPs privados (IPs públicos são sempre ocultados)",
  incLog: "Incluir tráfego recente",
  incChecks: "Incluir resultados",
  incFound: "Incluir dispositivos achados",
  introFound: "Monta um texto para um chat de IA (com modelo de pergunta): programa, erros desta sessão e os dispositivos encontrados.",
  preview: "Texto a colar (prévia)",
  size: "{n} / {max} caracteres",
  cut: " · {n} linhas antigas removidas",
  cutText: " · texto longo cortado",
  copy: "Copiar",
  copied: "Copiado — cole no chat de IA (Ctrl+V) e preencha «Situação».",
  copyFail: "Não foi possível copiar — outro programa pode estar usando a área de transferência",
  close: "Fechar",
};

export const PT_FIRST: Pt<FirstTextKey> = {
  hide: "Não mostrar de novo",
  help: "Ajuda:",
  narrow: "A janela é estreita, então o painel esquerdo está recolhido — «esquerda» abaixo é o painel aberto pelo botão «⚙ {b}» no canto superior esquerdo.",
  open: "Abrir o painel esquerdo",
};

export const PT_UPDATE: Pt<UpdateTextKey> = {
  msg: "A versão {a} está disponível (você tem a {b}).",
  open: "Página da versão",
  later: "Não avisar sobre esta versão",
  close: "Fechar (aparece de novo ao iniciar)",
};

export const PT_FILTER: Pt<FilterTextKey> = {
  find: "Procurar (Ctrl+F) — 01 03 ou texto",
  auto: "Auto",
  hex: "HEX",
  text: "Texto",
  prev: "Anterior (Shift+Enter)",
  next: "Próximo (Enter)",
  hitsOnly: "Só ocorrências",
  failOnly: "Só FALHA",
  all: "Todos",
  off: "Limpar filtro (Esc)",
  badHex: "não é HEX",
  none: "nenhuma",
  shown: "{a}/{b} linhas",
};

export const PT_BOUNDARY: Pt<BoundaryTextKey> = {
  title: "A tela travou",
  body: "Enviar isto ao desenvolvedor ajuda a corrigir. Reabrir o programa geralmente resolve.",
  report: "Relatar um problema",
  reload: "Recarregar",
  resetTip: "Se recarregar travar de novo — apaga as configurações de tela salvas (incluindo listas de comandos e regras)",
  resetArm: "Restaurar mesmo — clique de novo",
  reset: "Restaurar configurações",
};

export const PT_USAGE: Partial<UsageText> = {
  title: "Enviar estatísticas de uso?",
  why: "Saber quais recursos são usados ajuda a decidir o que melhorar depois. Se você ligar, os itens abaixo são enviados anonimamente, uma vez, ao fechar a janela.",
  sendsTitle: "Enviado",
  sends: ["Nome e versão do programa, versão do Windows (10/11), idioma da interface", "Minutos em que o programa ficou aberto", "Quantas vezes cada recurso foi usado (conectar, enviar, ler … — só contagens)", "Edição instalada ou portátil"],
  neverTitle: "Nunca enviado",
  never: ["Conteúdo do tráfego", "Endereços IP, portas, nomes COM", "Caminhos de arquivos", "Nomes de PC, usuário e dispositivos", "Qualquer ID que identifique a instalação ou o PC"],
  where: "Destinatário: Aptabase (UE). Sem internet ou se o envio falhar, os dados são descartados. Sua resposta também vira o valor inicial dos outros apps do PortDock neste PC (eles não perguntam de novo), e cada app pode mudá-la a qualquer momento em Configurações (⚙).",
  yes: "Enviar",
  no: "Não enviar",
  setting: "Enviar estatísticas de uso (anônimas, ao fechar)",
  hint: "Envia só as contagens de uso dos recursos, os minutos aberto, a versão do programa/Windows, o idioma da interface e se é edição instalada/portátil. Tráfego, endereços IP, portas, nomes COM, caminhos de arquivos e nomes de PC/usuário/dispositivos nunca são enviados. Destinatário: Aptabase (UE).",
};
