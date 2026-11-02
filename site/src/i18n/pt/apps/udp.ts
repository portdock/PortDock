// PortDock UDP — 소개 쪽 글.
export default {
  seo: {
    title: "PortDock UDP: emissor/receptor UDP grátis (broadcast, multicast)",
    desc: "Ferramenta grátis de teste UDP para Windows: receba e envie datagramas, broadcast e multicast, responda ao último remetente, eco e logs com carimbo de hora.",
  },
  summary: "Receba datagramas em uma porta e responda a um destino fixo ou ao último remetente. Pensado para dispositivos que usam broadcast e multicast.",
  who: [
    "Quem trabalha com dispositivos que transmitem o status por UDP",
    "Equipes que verificam a recepção multicast",
  ],
  features: [
    {
      title: "Lista de remetentes",
      body: "Reúne os endereços dos remetentes; clique em um para usá-lo como destino.",
    },
    {
      title: "Broadcast e multicast",
      body: "Permita broadcast, entre em um grupo multicast ou entre de novo, e escolha a placa de rede.",
    },
    {
      title: "Eco",
      body: "Devolve os dados ao remetente, com proteção automática contra laços.",
    },
  ],
  steps: [
    "Digite a porta de escuta e o destino",
    "«Iniciar»",
    "Digite e clique em «Enviar»",
  ],
  uses: [
    {
      title: "Receber transmissões de status",
      body: "Digite a porta de escuta e clique em «Iniciar». Cada datagrama é uma linha do log, e os remetentes se juntam na lista «Remetentes» (até 256).",
    },
    {
      title: "Quando você não sabe o endereço do dispositivo",
      body: "Comece a escutar na porta para a qual o dispositivo envia e observe «Remetentes». Clique em «Usar como destino» ao lado de um endereço para responder a ele.",
    },
    {
      title: "Enviar um broadcast",
      body: "Ative «Permitir broadcast» antes de iniciar e envie para 255.255.255.255 ou para um endereço como 192.168.0.255. Se estiver desativado, você é avisado.",
    },
    {
      title: "Verificar a recepção multicast",
      body: "Digite um grupo (224–239.x.x.x) e ele é ingressado ao iniciar. Com várias placas de rede (rede do escritório e das máquinas), escolha a «Placa de rede multicast» do lado das máquinas. O TTL padrão de 1 permanece na rede local.",
    },
  ],
  faq: [
    {
      q: "Nada chega",
      a: "Verifique o IP e a porta para os quais o dispositivo envia, a permissão do Firewall do Windows e se os dois estão na mesma sub-rede. No multicast, verifique o grupo e a placa de rede e tente «Reentrar».",
    },
    {
      q: "Ao iniciar, aparece «endereço em uso»",
      a: "Outro programa está com a porta; a linha de eventos informa esse programa e o PID dele. Use outra porta ou feche-o.",
    },
    {
      q: "O que significa «ICMP port unreachable»?",
      a: "O sistema operacional informa que nada está escutando naquela porta no destino. Verifique o número da porta e a alimentação do dispositivo.",
    },
    {
      q: "Quanto posso enviar de uma vez?",
      a: "Um envio é um datagrama. Acima de cerca de 64 KB o sistema operacional o recusa.",
    },
  ],
};
