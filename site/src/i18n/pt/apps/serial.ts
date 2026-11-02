// PortDock Serial — 소개 쪽 글(en 원문과 같은 열쇠·순서). 이름·명령·버전은 그대로.
export default {
  seo: {
    title: "PortDock Serial: terminal serial grátis para Windows (RS-232/485)",
    desc: "Terminal serial grátis para Windows com RS-232, RS-485 e portas COM USB: HEX/ASCII, reconexão automática, nove checksums, Modbus RTU e logs com carimbo de hora.",
  },
  summary: "Troque dados com dispositivos RS-232, RS-485 e serial USB e guarde um log de testes com carimbo de hora. Se você desconectar e reconectar um adaptador USB, ele reconecta ao mesmo dispositivo.",
  who: [
    "Técnicos de campo que colocam um dispositivo novo em funcionamento",
    "Desenvolvedores de firmware que testam um protocolo UART",
    "Quem precisa ler o tráfego Modbus RTU",
  ],
  features: [
    {
      title: "Portas fáceis de reconhecer",
      body: "Mostra, ao lado de cada porta, o nome do dispositivo, o VID:PID USB e o número de série, e atualiza ao conectar e desconectar.",
    },
    {
      title: "Resiste a desconexões",
      body: "Reabre o mesmo dispositivo depois de reconectá-lo, mesmo que o número COM tenha mudado, e registra cada queda e cada reconexão.",
    },
    {
      title: "Quatro modos de enquadramento",
      body: "Pausa entre bytes, terminador, comprimento fixo ou Modbus RTU, para que uma mensagem seja uma linha.",
    },
    {
      title: "Nove checksums e CRC personalizado",
      body: "Acrescente ao enviar CRC16 Modbus/CCITT/XMODEM, CRC8, LRC, BCC, SUM8, SUM16, CRC-32 ou um CRC personalizado, e verifique-os ao receber.",
    },
    {
      title: "Decodificação Modbus RTU",
      body: "Decodifica requisições, respostas e exceções em endereço, função e valores.",
    },
    {
      title: "Linhas de sinal",
      body: "Alterne DTR/RTS e acompanhe CTS/DSR/RI/CD nos indicadores e no log.",
    },
    {
      title: "Logs de teste",
      body: "Carimbos de hora em milissegundos, lista de comandos, envio repetido e log contínuo em arquivo.",
    },
    {
      title: "Verificar conexão…",
      body: "Lê, sem direitos de administrador, o dispositivo, o driver, o código de problema, o temporizador de latência FTDI e a economia de energia USB da porta escolhida, e executa um teste de loopback ou de eco RS-485 de 2 fios. A partir da 0.10.0 também um teste de duas portas (dois adaptadores ligados entre si), padrões (0x00–0xFF, 0x55/0xAA) e um diagrama de ligação. Nada é alterado.",
    },
    {
      title: "Compartilhar porta — COM ↔ TCP (a partir da 0.10.0)",
      body: "Expõe a porta COM aberta como servidor TCP para que outros programas, o WSL2, o Docker ou outro PC usem a mesma porta. Bruto ou RFC 2217 (troca remota de baud rate/paridade); os dados recebidos vão para todos os clientes e o cliente que envia fica marcado no log. Por padrão só este PC (127.0.0.1); outros PCs só quando você permitir. Sem driver de COM virtual e sem direitos de administrador.",
    },
    {
      title: "Gateway Modbus TCP ↔ RTU (a partir da 0.10.0)",
      body: "Transforma o PC em um gateway — SCADA, uma IHM ou um programa do PC se conecta por Modbus TCP (porta 502 por padrão) e as requisições seguem para dispositivos RS-485 como quadros RTU, com as respostas voltando em MBAP. Uma requisição por vez; sem resposta, exceção 0B; sem rota, 0A; estatísticas de requisições, respostas e timeouts e linhas de log como «TCP #1 → RTU escravo 3 FC03».",
    },
    {
      title: "Escuta passiva Modbus RTU (a partir da 0.10.0)",
      body: "Escuta o tráfego mestre–escravo por um adaptador no barramento RS-485 sem enviar nada. Os quadros são separados por CRC (ressincronizando quando as pausas se confundem), com pares requisição/resposta, tempos de resposta, faltas de resposta, exceções e estatísticas. No RS-232, duas portas com um cabo em Y se juntam em uma única linha do tempo. Salva em arquivo, inclusive CSV.",
    },
  ],
  steps: [
    "Escolha a porta, o baud rate e a paridade e clique em «Conectar»",
    "Digite HEX ou ASCII; acrescente um checksum ou um fim de linha se precisar",
    "«Enviar» — as linhas recebidas aparecem como RX ◀ e as enviadas como TX ▶",
  ],
  similar: "Ferramentas parecidas incluem o Tera Term e o PuTTY (terminais de código aberto). O PortDock Serial reúne em uma tela recursos de teste de dispositivos — reconexão USB, enquadramento, verificação de checksum e decodificação Modbus RTU.",
};
