// PortDock TCP — 소개 쪽 글.
export default {
  seo: {
    title: "PortDock TCP: cliente, servidor e relay TCP para testes (grátis)",
    desc: "Ferramenta grátis de teste TCP para Windows: cliente, servidor com vários pares e relay (monitor), eco, reconexão automática e enquadramento Modbus TCP.",
  },
  summary: "Conecte-se a um dispositivo Ethernet (cliente) ou deixe os dispositivos se conectarem ao PC (servidor). O servidor aceita vários pares e pode enviar para um ou para todos; o relay fica entre dois dispositivos e registra os dois sentidos.",
  who: [
    "Desenvolvedores de IHM, MES e software supervisório",
    "Desenvolvedores de firmware de dispositivos TCP",
  ],
  features: [
    {
      title: "Cliente e servidor",
      body: "O servidor aceita até 64 pares; envie para um ou para todos e desconecte-os individualmente.",
    },
    {
      title: "Relay (monitoramento)",
      body: "Fica entre A (por exemplo, uma IHM) e B (por exemplo, um CLP), repassa o tráfego e registra os dois sentidos.",
    },
    {
      title: "Reconexão automática",
      body: "O cliente reconecta em um intervalo definido quando o link cai.",
    },
    {
      title: "Eco",
      body: "O servidor devolve o que chega; o eco se desliga sozinho acima de 200 por segundo para evitar laços de eco.",
    },
    {
      title: "Enquadramento e checksums",
      body: "Divida o fluxo TCP por pausa, terminador, comprimento fixo ou Modbus TCP (comprimento MBAP) e verifique nove tipos de checksum ou um CRC personalizado.",
    },
    {
      title: "Endereço de escuta 127.0.0.1 na primeira execução (a partir da 0.10.0)",
      body: "O «Endereço de escuta» do servidor e o «Endereço deste PC ao qual A se conecta» do relay começam em 127.0.0.1 (só este PC). Para que outro PC ou uma IHM se conecte, escolha ali 0.0.0.0 (todas as placas de rede) ou o endereço de uma placa. As configurações salvas por versões anteriores são mantidas.",
    },
  ],
  steps: [
    "Escolha «Cliente» ou «Servidor» e digite o endereço e a porta",
    "«Conectar» ou «Escutar»",
    "Digite e clique em «Enviar»",
  ],
  uses: [
    {
      title: "Conversar com um dispositivo",
      body: "Se o dispositivo espera conexões, use «Cliente» com o IP e a porta dele, envie comandos e leia as respostas em HEX ou ASCII. O cliente reconecta em um intervalo definido se o link cair.",
    },
    {
      title: "Quando o dispositivo se conecta ao PC",
      body: "Abra uma porta com «Servidor» e até 64 dispositivos podem se conectar. Envie para um ou para todos e desconecte-os um de cada vez.",
    },
    {
      title: "Registrar o tráfego IHM ⇄ CLP",
      body: "Com «Relay» o PC fica entre dois dispositivos; aponte a IHM para este PC e os dois sentidos são registrados. Os bytes passam sem alteração. A partir da 0.8.0 o relay pode salvar um pcap e mostra pares requisição-resposta Modbus/MC e tempos de resposta.",
    },
    {
      title: "Ler um dispositivo Modbus TCP uma vez",
      body: "Conecte-se à porta 502 e aparece uma barra «Ver como Modbus TCP». Ela separa requisições e respostas uma a uma e as decodifica no painel de detalhes. Para leitura contínua, o Modbus Master é mais prático.",
    },
  ],
  faq: [
    {
      q: "O cliente não consegue conectar (CONNECT FAIL)",
      a: "Verifique a alimentação e o cabo do dispositivo, o IP e a porta, e se o PC e o dispositivo estão na mesma sub-rede (por exemplo, 192.168.0.x).",
    },
    {
      q: "Iniciei o servidor, mas o dispositivo não consegue conectar",
      a: "Confirme que você o permitiu no aviso do Firewall do Windows e que o dispositivo se conecta ao IP deste PC. Um erro de «já em uso» significa que outro programa está com a porta.",
    },
    {
      q: "Os dados aparecem juntos ou divididos",
      a: "O TCP não preserva os limites das mensagens. Mude o enquadramento em «Recepção» para terminador, comprimento fixo ou Modbus TCP (comprimento MBAP), ou ajuste a pausa.",
    },
    {
      q: "O relay altera o tráfego?",
      a: "Não. Os bytes são repassados como chegam; o enquadramento e a verificação de checksum só servem para o log, e a resposta automática e o eco ficam desligados. Só chega aos dispositivos o que você mesmo injetar, então tenha cuidado.",
    },
  ],
  similar: "Uma ferramenta parecida é o Hercules SETUP utility (HW-group, freeware).",
};
