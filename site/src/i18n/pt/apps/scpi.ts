// PortDock SCPI — 소개 쪽 글. *IDN? 등 명령 이름은 그대로.
export default {
  seo: {
    title: "PortDock SCPI: terminal SCPI grátis (socket LAN, RS-232, sem VISA)",
    desc: "Terminal grátis de instrumentos SCPI por socket LAN (5025) ou RS-232 sem VISA: *IDN?, fila de erros, esperas com *OPC? e medições repetidas em CSV.",
  },
  summary: "Envie comandos a instrumentos SCPI, como fontes de alimentação, multímetros e osciloscópios, e leia as respostas. Conecta por socket LAN (TCP 5025) ou RS-232 sem instalar o VISA, identifica o instrumento com *IDN?, esvazia a fila de erros e registra em CSV leituras numéricas repetidas.",
  who: [
    "Desenvolvedores que conferem comandos à mão antes de escrever a automação de testes",
    "Técnicos de campo que precisam ver rápido um instrumento em um PC sem VISA",
  ],
  features: [
    {
      title: "Sem VISA",
      body: "Socket LAN (geralmente 5025) e RS-232 (baud rate, paridade, controle de fluxo) com fim de linha LF, CR LF ou CR. VXI-11, HiSLIP e USBTMC ainda não são suportados.",
    },
    {
      title: "Consulta, escrita, leitura",
      body: "Comandos terminados em ? são consultados e os demais são escritos. São mostrados os tempos de resposta, os timeouts e as respostas sem fim de linha. Histórico de comandos, lista de comandos e preenchimento automático dos comandos comuns.",
    },
    {
      title: "ID, fila de erros, *OPC?",
      body: "*IDN? dividido em fabricante, modelo, número de série e firmware; SYST:ERR? é repetido até 0 para listar todos os erros da fila. Botões para *RST, *CLS e para esperar com *OPC?.",
    },
    {
      title: "Medição repetida",
      body: "Repita uma consulta como MEAS:VOLT:DC? em um intervalo e por um número de vezes, com tabela de valores, tendência e estatísticas (mín., máx., média, desvio padrão), salvo como CSV.",
    },
    {
      title: "Dados em bloco",
      body: "Blocos IEEE 488.2 (#NXXXX…) são lidos pelo cabeçalho de comprimento, então bytes LF dentro de dados binários não os cortam. Prévia em HEX e gravação em arquivo (por exemplo, capturas de tela PNG).",
    },
  ],
  steps: [
    "LAN: IP do instrumento e porta 5025; serial: porta e baud rate conforme o instrumento",
    "«Conectar» (F4) — *IDN? mostra o nome do instrumento",
    "Digite um comando e pressione Enter; confira os erros com «Esvaziar fila de erros»",
  ],
  uses: [
    {
      title: "Conferir comandos antes de escrever a automação",
      body: "Digite os comandos à mão e veja a resposta e o tempo de resposta. Comandos terminados em ? são consultas e os demais são escritas. Confira os erros na hora com «Esvaziar fila de erros».",
    },
    {
      title: "Chegar a um instrumento em um PC sem VISA",
      body: "Conecte-se direto por socket LAN (geralmente a porta 5025) ou RS-232. *IDN? é dividido em fabricante, modelo, número de série e firmware.",
    },
    {
      title: "Registrar leituras repetidas em CSV",
      body: "Em «Medição repetida», faça uma consulta como MEAS:VOLT:DC? em um intervalo e por um número de vezes, veja a tabela, a tendência e as estatísticas (mín., máx., média, desvio padrão) e salve como CSV.",
    },
    {
      title: "Obter dados em bloco, como capturas de tela",
      body: "Blocos IEEE 488.2 (#N…) são lidos pelo cabeçalho de comprimento, então bytes LF dentro de dados binários não os cortam. Prévia em HEX e gravação em arquivo (PNG e similares).",
    },
  ],
  faq: [
    {
      q: "Aparece «connection refused»",
      a: "A porta é diferente (confira a «porta de socket» do manual — nem todo instrumento usa a 5025) ou a interface de socket está desligada. Alguns instrumentos recusam uma nova conexão enquanto outro programa (uma sessão VISA) está conectado.",
    },
    {
      q: "Aparece «no response (timeout)»",
      a: "Algo que não é consulta foi enviado como consulta, o comando está escrito errado (confira a fila de erros) ou o instrumento está ocupado medindo. Aumente a espera pela resposta ou use *OPC?. «Reply not finished» significa que o fim de linha (LF, CR LF, CR) é diferente do do instrumento.",
    },
    {
      q: "O que é -410 Query INTERRUPTED?",
      a: "O comando seguinte foi enviado antes de a resposta ser lida. Se você enviou uma consulta com «Escrever», busque a resposta primeiro com «Ler».",
    },
    {
      q: "Suporta USBTMC, GPIB, VXI-11 ou HiSLIP?",
      a: "Por enquanto não. O VXI-11 não é suportado no momento; HiSLIP, USBTMC e GPIB precisam do VISA ou de drivers e ficam fora do escopo. A maioria dos instrumentos LAN também oferece um socket (5025), e instrumentos somente USB com a opção de «COM virtual USB» funcionam por serial.",
    },
    {
      q: "Posso experimentar sem um instrumento?",
      a: "Execute o PortDock Simulator como servidor TCP na 5025 com enquadramento LF e o exemplo [SCPI *IDN? reply], e conecte-se a 127.0.0.1:5025.",
    },
  ],
  similar: "As ferramentas de fabricantes baseadas em VISA (NI MAX, Keysight Connection Expert …) também podem enviar comandos. O PortDock SCPI conecta por socket LAN ou RS-232 em PCs sem VISA.",
};
