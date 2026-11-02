// PortDock PLC Simulator — 소개 쪽 글. MC 명령 이름은 포르투갈어 용어(leitura/escrita em lote …).
export default {
  seo: {
    title: "PortDock PLC Simulator: simulador do protocolo MC (SLMP) grátis",
    desc: "Ferramenta grátis para Windows que testa links do protocolo MC (3E/4E, binário/ASCII) sem CLP: tabelas de dispositivos (D, M, X, Y …), leitura/escrita e falhas.",
  },
  summary: "O PC responde a requisições do protocolo MC (SLMP) como a porta Ethernet de um CLP. Coloque valores nas tabelas de dispositivos e uma IHM, um software de coleta de dados ou um supervisório poderá lê-los e escrevê-los; atrasos e códigos de término de erro propositais testam o tratamento de erros. Segue os formatos de mensagem dos manuais públicos da Mitsubishi Electric (SLMP/MC); não tem vínculo com a empresa e o comportamento pode ser diferente do de um CLP real.",
  who: [
    "Equipes que preparam telas de IHM e a comunicação antes de o CLP chegar",
    "Desenvolvedores de software de coleta de dados ou supervisório que leem CLPs pelo protocolo MC",
  ],
  features: [
    {
      title: "3E/4E, binário/ASCII, TCP/UDP",
      body: "Escuta como servidor TCP (vários clientes) ou por UDP. As respostas 4E levam o número de série da requisição. Por padrão só este PC (127.0.0.1) pode se conectar; permitir outros PCs é decisão sua.",
    },
    {
      title: "Comandos implementados",
      body: "0401 leitura e 1401 escrita (palavras e bits, subcomandos 0000–0003), 0403 leitura aleatória, 1402 escrita aleatória e 0619 teste de loopback. A partir da 0.6.0 também 0406/1406 leitura/escrita de bloco, 0801/0802 monitor, 1001–1006 RUN/STOP/PAUSE/limpeza de latch/reset remotos (somente estado simulado) e 0101 leitura do nome do modelo (valores simulados). Os demais comandos recebem o código de término C059.",
    },
    {
      title: "Protocolo dedicado LS XGT (a partir da 0.10.0)",
      body: "Mude «Protocolo» para «XGT dedicado» e ele responde ao protocolo dedicado FEnet dos CLPs XGT da LS ELECTRIC (cabeçalho «LSIS-XGT», padrão TCP 2004 · UDP 2005): leitura h0054 e escrita h0058, individuais (%MX, %MB, %MW, %MD, %ML, até 16 blocos) e contínuas (%MB bytes, até 1.400 bytes), dispositivos P, M, K, F, T, C, D, L, N, e respostas com código de erro (1–6, h75–h78). Feito a partir dos manuais do usuário públicos da LS ELECTRIC — sem vínculo com a empresa.",
    },
    {
      title: "Regras de condição (a partir da 0.6.0)",
      body: "Imite handshakes como «quando o bit de requisição ligar, ligue o bit de concluído 300 ms depois»: condição (bit ON/OFF/borda, comparação de palavras, periódica) → atraso (fixo ou aleatório) → ações (escritas de bits e palavras). Não é um programa ladder.",
    },
    {
      title: "18 dispositivos",
      body: "X, Y, M, L, F, B, SM, D, W, R, ZR, SD, TS, TC, TN, CS, CC e CN. X, Y, B, W e ZR usam números hexadecimais; cada dispositivo tem um tamanho e requisições além dele recebem C056. Dispositivos de bit podem ser vistos como palavras de 16 pontos; as células podem ser de 32 bits, float, string ou nomeadas.",
    },
    {
      title: "Injeção de falhas",
      body: "Atraso de resposta (com faixa), falta de resposta ou um código de término escolhido — direcionados por comando, dispositivo, a cada N requisições ou por probabilidade.",
    },
    {
      title: "Tráfego decodificado",
      body: "Cada requisição mostra o nome do comando, o dispositivo e os pontos; cada resposta, o código de término e seu significado. As células alteradas por um cliente piscam, com estatísticas.",
    },
    {
      title: "Simulação e estados salvos",
      body: "Os valores podem mudar sozinhos (incremento, aleatório, senoidal, rampa, alternância), e os valores dos dispositivos e as configurações das células são salvos e carregados de um arquivo JSON.",
    },
  ],
  steps: [
    "Combine com o cliente o quadro (3E/4E), o código de dados (binário/ASCII) e a porta",
    "Escolha um dispositivo (D, M, X …) e digite os valores",
    "«Iniciar» — as leituras e escritas do cliente são respondidas a partir das tabelas",
  ],
  faq: [
    {
      q: "Ele se comporta exatamente como um CLP real?",
      a: "Não. Segue os formatos de mensagem dos manuais públicos e não foi comparado com hardware real. Nenhum programa ladder é executado, e códigos de erro, tempos, limites de conexão e faixas de dispositivos de cada modelo podem ser diferentes.",
    },
    {
      q: "Como conecto uma IHM em outro PC?",
      a: "Ligue «Permitir que outros PCs se conectem (0.0.0.0)» e permita o programa no Firewall do Windows. Não o execute em uma rede de fábrica com o mesmo IP e a mesma porta de um CLP real.",
    },
  ],
  similar: "Ferramentas parecidas incluem o DummyPLC (grátis, código fechado) e o HslCommunication (comercial). O PortDock PLC Simulator é grátis (GPL-3.0) e acrescenta injeção de falhas, tráfego decodificado e simulação de valores.",
};
