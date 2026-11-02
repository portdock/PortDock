// PortDock Simulator — 소개 쪽 글.
export default {
  seo: {
    title: "PortDock Simulator: simulador de dispositivos serial, TCP e UDP",
    desc: "Simulador grátis de dispositivos por regras: «quando chega isto, responda aquilo» por serial, TCP e UDP. Desenvolva sem hardware e teste atrasos e perdas.",
  },
  summary: "Imite qualquer dispositivo com regras «quando chega isto → responda aquilo». Desenvolva software supervisório sem hardware e teste o tratamento de erros com atrasos, respostas descartadas (a cada N ou por acaso) e respostas alternadas.",
  who: [
    "Desenvolvedores de software supervisório que ainda não têm o hardware",
    "Equipes que montam bancadas de teste automáticas",
  ],
  features: [
    {
      title: "Regras com curingas",
      body: "Em HEX, ?? (qualquer byte) e ** (zero ou mais). O ASCII casa literalmente por padrão; ative «Curingas» em uma regra para usar ? e *. Casamento exato ou contém.",
    },
    {
      title: "Respostas sob medida",
      body: "Checksum e fim de linha automáticos, atraso de resposta e contagem de acertos por regra.",
    },
    {
      title: "Mensagens iniciadas pelo dispositivo",
      body: "Envie heartbeats ou relatórios de status em um intervalo.",
    },
    {
      title: "Quatro meios de transporte",
      body: "Serial, servidor TCP, cliente TCP e UDP. Salve e carregue as regras junto com as configurações de conexão e enquadramento em um único arquivo JSON.",
    },
    {
      title: "Endereço 127.0.0.1 na primeira execução (a partir da 0.10.0)",
      body: "O «Host» do servidor TCP e do UDP começa em 127.0.0.1 (só este PC). Para um software supervisório em outro PC, escolha 0.0.0.0 (todas as placas) ou o endereço de uma placa. As configurações salvas por versões anteriores são mantidas.",
    },
  ],
  steps: [
    "Escolha um transporte e digite a porta ou o endereço",
    "«+ Adicionar regra» — Quando / Responder",
    "«Iniciar» — envie uma requisição do seu software supervisório",
  ],
  uses: [
    {
      title: "Desenvolver software antes de o hardware chegar",
      body: "Transforme os pares requisição/resposta do manual do dispositivo em regras «quando → responda» e conecte a sua IHM ou programa de teste sem o dispositivo real.",
    },
    {
      title: "Testar timeouts e tratamento de erros",
      body: "Atrasos de resposta (com variação), nenhuma resposta a cada N vezes ou por acaso e respostas alternadas mostram como o seu software lida com respostas atrasadas ou ausentes.",
    },
    {
      title: "Praticar SCPI sem instrumento",
      body: "Execute um servidor TCP na 5025 com o exemplo [SCPI *IDN? reply] e conecte o PortDock SCPI a 127.0.0.1. Respostas como «+1.2{rand 0..9}E+00» mudam a cada requisição.",
    },
    {
      title: "Imitar heartbeats e relatórios de status",
      body: "As «Mensagens iniciadas pelo dispositivo» são enviadas sem requisição em um intervalo definido. Os marcadores {counter}, {rand} e {time} são preenchidos a cada envio.",
    },
  ],
  faq: [
    {
      q: "As requisições chegam, mas nenhuma resposta sai",
      a: "Verifique se a regra está ligada, se o tipo de padrão (HEX/ASCII) e «exato/contém» casam, e se nenhuma regra «**» está acima dela. Com «Registrar requisições sem correspondência» ligado, aparece uma linha «NO MATCH»; clique nela com o botão direito para criar uma regra a partir dela.",
    },
    {
      q: "As requisições chegam divididas ou juntas",
      a: "As regras comparam quadros inteiros. Ajuste o «Enquadramento» (pausa ou terminador) e a pausa em ms. O UDP não precisa de enquadramento — um datagrama é um quadro.",
    },
    {
      q: "Como conecto um programa no mesmo PC?",
      a: "No TCP, inicie um servidor e faça o programa se conectar a 127.0.0.1. No serial, use um par de COM virtuais (com0com ou similar).",
    },
    {
      q: "Minha regra «*IDN?» responde a requisições sem relação",
      a: "Com «Curingas» ligado, ? e * em uma regra ASCII casam com qualquer caractere. Deixe os curingas desligados nas regras SCPI (é o padrão das regras novas).",
    },
    {
      q: "Posso levar as regras para outro PC?",
      a: "«Salvar regras» guarda as regras junto com o transporte, a porta, o endereço, o enquadramento e as mensagens iniciadas pelo dispositivo em um único arquivo JSON — mantenha um por dispositivo ou teste.",
    },
  ],
};
