// PortDock Hardware Tester — 소개 쪽 글.
export default {
  seo: {
    title: "PortDock Hardware Tester: registro de quedas de Wi-Fi e ping",
    desc: "Ferramenta grátis para Windows que registra quedas de Wi-Fi: ping no roteador e na internet, tempo de DNS, motivos de desconexão do Windows e Bluetooth.",
  },
  summary: "Transforma «meu Wi-Fi fica caindo» em um registro. Durante a gravação, faz ping no seu gateway (roteador) e em um endereço da internet lado a lado, desenha latência e perda em um só gráfico com os motivos de desconexão Wi-Fi que o Windows registra na mesma linha do tempo, e diz se você deve olhar do lado do roteador ou além dele. Também registra quando dispositivos Bluetooth se conectam e desconectam. Somente leitura, sem direitos de administrador; não altera nenhuma configuração.",
  who: [
    "Quem tem quedas de Wi-Fi e quer saber se o problema é o roteador ou a internet",
    "Quem quer um registro de quando fones ou teclados Bluetooth se desconectam",
    "Técnicos de campo que documentam o link sem fio do PC de um dispositivo antes de uma chamada de suporte",
  ],
  features: [
    {
      title: "Gateway versus internet",
      body: "Faz ping no roteador e em um endereço da internet (1.1.1.1, 8.8.8.8 ou o seu) no mesmo compasso e mostra lado a lado perda, média, percentil 95 e jitter. Nunca mais de uma vez por segundo; uma gravação para depois de 24 horas.",
    },
    {
      title: "Motivos de desconexão do Windows no mesmo gráfico",
      body: "Lê o log WLAN-AutoConfig (8001 conexão, 8003 desconexão) e o mostra como linhas no gráfico e com a redação do motivo do Windows na lista de eventos. O nome da rede Wi-Fi não é lido.",
    },
    {
      title: "Tempo de resposta do DNS",
      body: "A cada 5 s um nome (por padrão example.com) é consultado no servidor DNS sem usar o cache, medindo respostas e falhas.",
    },
    {
      title: "Resumo de onde olhar e CSV",
      body: "Diz «lado do roteador» quando a perda chega ao gateway e «além do roteador» quando só o destino da internet perde respostas — onde olhar, não a causa. As gravações são salvas como CSV.",
    },
    {
      title: "Log de conexão Bluetooth",
      body: "Lê a cada 2 s o estado «Conectado» dos dispositivos pareados e registra conexões e quedas. Os nomes só aparecem na tela; o texto salvo e copiado usa «Dispositivo N».",
    },
    {
      title: "Log de conexão/desconexão USB (a partir da 0.10.0)",
      body: "Descobre qual dispositivo USB está por trás de um som repetido de conexão/desconexão. Registra os horários de conexão e remoção com o nome do dispositivo, VID:PID, porta do hub e velocidade, marca como «possíveis quedas repetidas» um dispositivo que cai 3 ou mais vezes em 10 minutos e como «Vale conferir» um dispositivo USB 3 funcionando em velocidade USB 2.0. Também lê os últimos horários de chegada e remoção anteriores à abertura do app.",
    },
    {
      title: "Modo de áudio Bluetooth e tons esquerdo/direito",
      body: "Mostra se a saída padrão é estéreo (A2DP) ou viva-voz para chamadas, e toca tons de teste pela esquerda, pela direita e pelos dois lados.",
    },
    {
      title: "Sinal e canal do Wi-Fi (sob demanda)",
      body: "Somente enquanto «Ver sinal» está ligado: intensidade do sinal, velocidade do link, banda, canal e quantas redes próximas compartilham cada canal (sem nomes). A partir do Windows 11 24H2 isso exige permissão de localização (o restante funciona sem ela).",
    },
  ],
  steps: [
    "Escolha o destino da internet e o intervalo e clique em «Iniciar registro»",
    "Deixe rodando até as quedas acontecerem — latência do roteador e da internet e motivos do Windows em um só gráfico",
    "Veja onde olhar em «Resumo» e depois «Salvar CSV…» ou «Copiar resumo»",
  ],
  faq: [
    {
      q: "Ele mede a velocidade da internet?",
      a: "Não. Registra quedas, latência e perda, não a velocidade de download ou upload. Para isso, use um site de teste de velocidade.",
    },
    {
      q: "Ele resolve o problema?",
      a: "Não. Apenas lê e não altera nenhuma configuração. Indica onde olhar (lado do roteador, além do roteador, DNS, motivos de desconexão do Windows).",
    },
    {
      q: "O que ele envia para a rede?",
      a: "Somente os pings ao gateway e ao endereço da internet escolhido e uma consulta DNS, durante a gravação. Os destinos são sempre exibidos, e depois que você para nada é enviado.",
    },
  ],
  similar: "Ferramentas parecidas incluem o PingPlotter (comercial, com edição gratuita) e o WifiHistoryView (grátis, histórico de conexões e desconexões). O PortDock Hardware Tester é grátis (GPL-3.0) e reúne em um só gráfico os pings ao gateway e à internet e os motivos de desconexão do Windows, junto com um log de conexão Bluetooth.",
};
