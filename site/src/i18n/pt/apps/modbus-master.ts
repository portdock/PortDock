// PortDock Modbus Master — 소개 쪽 글. 내장 장비 수가 들어가는 글은 함수.
export default {
  seo: {
    title: "PortDock Modbus Master: ferramenta Modbus RTU/TCP grátis",
    desc: "Mestre Modbus RTU/TCP grátis (consulta) para Windows: várias tabelas, F32/U32, ordem de bytes, notação 40001, escritas, varredura de escravos e logs CSV.",
  },
  summary: "Peça dados a dispositivos Modbus no lugar de um CLP ou de uma IHM. Consulte várias tabelas por endereço de escravo, função, endereço e intervalo, veja F32/U32/strings com ordem de bytes e notação 40001, e dê um duplo clique em uma célula para escrever. Inclui HEX decodificado de requisição/resposta, estatísticas e log de valores em CSV.",
  who: [
    "Técnicos de campo que conferem o mapa Modbus de um inversor ou medidor novo",
    "Desenvolvedores que testam o firmware de dispositivos escravos",
  ],
  features: [
    {
      title: "Várias tabelas de consulta",
      body: "Cada tabela tem seu próprio endereço de escravo, função (01–04), início, quantidade e intervalo, com uma contagem de erros na aba. RTU serial, Modbus TCP e RTU sobre TCP.",
    },
    {
      title: "Valores tipados e ordem de bytes",
      body: "De U16 a F64 e strings em ABCD/CDAB/BADC/DCBA, HEX/BIN e notação 40001. Compartilha com o Modbus Slave o formato CSV do mapa de registradores.",
    },
    {
      title: "Escritas com prévia",
      body: "Dê um duplo clique para escrever com 05/06/0F/10 e veja de antemão os bytes exatos. A opção «sempre FC15/16» envia até valores isolados com 0F/10.",
    },
    {
      title: "Perfis de dispositivo",
      body: (c: { nDevices: number }) => `Escolha um dos ${c.nDevices} dispositivos incluídos (inversores, controladores de temperatura, medidores de energia …) para adicionar tabelas de consulta com nomes (unidade e escala), tipos, endereço de escravo e configurações seriais padrão.`,
    },
    {
      title: "Varredura de endereços de escravo e de registradores",
      body: "Descubra quais endereços de escravo (1–247) respondem e quais faixas de endereços podem ser lidas, e transforme-os em tabelas.",
    },
    {
      title: "Descobrir as configurações da linha (a partir da 0.10.0)",
      body: "Quando o baud rate, a paridade e o endereço de um dispositivo são desconhecidos, envia uma leitura curta para cada baud rate escolhido (1200–115200) × paridade/stop bits × faixa de endereços e lista as combinações que respondem. Uma resposta de exceção também significa «há um dispositivo ali». Com estimativa de tempo, botão de parar e «Conectar com esta configuração»; o endereço 0 (broadcast) nunca é usado. Não serve para barramentos com outro mestre.",
    },
    {
      title: "«Sem resposta» — causas possíveis (a partir da 0.10.0)",
      body: "Organiza os resultados recentes das requisições em causas possíveis e como verificá-las — nenhum byte (fiação, endereço, polaridade A/B), só a requisição devolvida em eco (eco do adaptador de 2 fios), erros de CRC (baud rate, paridade, ruído, terminação), quadros truncados (timeout, latência USB), o significado de cada código de exceção, outro endereço respondendo. Links para guias e para o assistente de diagnóstico; copiável como texto.",
    },
    {
      title: "Backup, comparação e restauração das configurações do dispositivo (a partir da 0.10.0)",
      body: "Para troca e manutenção de dispositivos. Lê várias faixas de uma vez (ou as preenche a partir de um perfil de dispositivo) em JSON e CSV — faixas acima de 125 são divididas e as que falham são listadas — e compara com o dispositivo agora ou com outro backup, mostrando só as diferenças. A restauração escreve apenas as células que você escolher: prévia (agora × o que será escrito), um segundo clique para escrever e depois uma leitura de conferência. Registradores de entrada e registradores somente leitura do perfil ficam bloqueados.",
    },
    {
      title: "Timeouts, novas tentativas, estatísticas",
      body: "Defina o timeout, as novas tentativas e o atraso; conte requisições, OK, timeouts, erros de CRC e exceções, com tempos de resposta por tabela. As exceções são explicadas.",
    },
    {
      title: "Log de valores e tendências",
      body: "Registre valores em CSV a cada consulta ou quando mudarem, e acompanhe as células escolhidas como pequenas linhas de tendência.",
    },
    {
      title: "Vigilância de valores e alarmes (a partir da 0.10.0)",
      body: "Por célula: limites inferior/superior, sem mudança (travado) por N segundos e comunicação perdida por N segundos, com uma margem de retorno (histerese). Uma célula disparada é destacada, com uma lista de alarmes (acionado, normalizado, duração, reconhecimento), som opcional, piscada da barra de tarefas e um log CSV de alarmes. Um auxílio de monitoramento, não um dispositivo de segurança.",
    },
  ],
  steps: [
    "Combine a conexão e a porta (ou o IP) com o dispositivo",
    "«Conectar» (F4) e defina endereço de escravo, função, início e quantidade conforme o manual",
    "Duplo clique em uma célula para escrever; clique com o botão direito para nome e tipo",
  ],
  similar: "Ferramentas parecidas incluem o Modbus Poll comercial (Witte Software) e o QModMaster de código aberto. O PortDock Modbus Master é grátis (GPL-3.0) e sem limite de tempo.",
};
