// PortDock MCP — 소개 쪽 글. (hidden)·~·xx-… 는 결과에 실제로 나오는 글이라 그대로.
export default {
  seo: {
    title: "PortDock MCP: leia portas COM e Modbus a partir de clientes de IA",
    desc: "Servidor MCP grátis para o Claude Desktop e outras IAs lerem relatórios de portas COM e valores Modbus, MC e SCPI. Só escreve em simuladores 127.0.0.1.",
  },
  summary: "Um servidor MCP sem janela, iniciado por clientes de IA (Claude Desktop, VS Code, Cursor …). A IA lê as portas COM e as placas de rede deste PC e lê valores Modbus, do protocolo MC e SCPI de dispositivos que você indicar. As ferramentas de escrita só aceitam o endereço deste PC (127.0.0.1) e são pensadas para simuladores. A partir da 0.10.0 as escritas Modbus vão somente para um destino que se identifica como PortDock. As escritas MC são verificadas só pelo endereço, então, se um programa deste PC repassa para outro dispositivo (um relay TCP, gateway ou túnel), uma escrita pode chegar a um dispositivo real.",
  who: [
    "Quem quer que um assistente de IA ajude a examinar problemas de portas COM e adaptadores USB",
    "Desenvolvedores que querem ler valores Modbus, MC ou SCPI dentro de uma conversa com uma IA",
    "Quem pratica o uso de ferramentas por uma IA com simuladores em vez de dispositivos reais",
  ],
  features: [
    {
      title: "Nove ferramentas de leitura",
      body: "Lista de portas COM, relatório do Port Inspector, escuta serial (não envia nada), leituras Modbus (FC 01–04), leitura em lote MC 3E, consultas SCPI, ping, placas de rede e mapas de registradores de dispositivos.",
    },
    {
      title: "Escritas só em simuladores 127.0.0.1",
      body: "Pratique «escrever e ler de volta» com o Modbus Slave ou o PLC Simulator neste PC. Qualquer outro endereço é recusado antes de conectar. A partir da 0.10.0 as escritas Modbus também exigem que o destino se identifique como «PortDock» (FC 2B/0E); as escritas MC são verificadas só pelo endereço, então não as use com um programa de relay em execução.",
    },
    {
      title: "Somente consultas SCPI",
      body: "Envia uma consulta terminada em «?»; as que podem alterar o estado, como *TST?, *CAL? e *RST, são recusadas. READ? e MEAS…?, que iniciam uma nova medição, são recusadas por padrão e só são enviadas quando você permite com allow_measure (desde a 0.8.0). Use FETC? para ler apenas o último valor.",
    },
    {
      title: "Log de sessão e limites de frequência",
      body: "Cada chamada é guardada neste PC como linhas JSON e nunca é enviada para fora. Ao mesmo destino, no máximo uma vez a cada 100 ms e 120 chamadas por minuto.",
    },
    {
      title: "Dados pessoais ocultados",
      body: "Caminhos de pastas de usuário nos resultados viram «~», endereços MAC viram «xx-…» e nomes de rede viram «(hidden)».",
    },
    {
      title: "Um arquivo para instalar",
      body: "Sem Python, Node nem Docker: um .mcpb (abra no Claude Desktop) ou um único exe em um zip.",
    },
  ],
  steps: [
    "Abra o PortDock-MCP.mcpb no Claude Desktop (outros clientes: coloque nas configurações o caminho do exe do zip)",
    "Peça à IA algo como «liste minhas portas COM» — o cliente pergunta a você antes de cada chamada de ferramenta",
    "Informe o endereço, a porta e o endereço de escravo para ler um dispositivo. Pratique com o Modbus Slave ou o PLC Simulator em 127.0.0.1",
  ],
  faq: [
    {
      q: "A IA pode alterar as configurações de um dispositivo?",
      a: "As duas ferramentas de escrita só funcionam quando o destino é 127.0.0.1 ou localhost (este PC); qualquer outro endereço é recusado antes de conectar. A partir da 0.10.0 o modbus_write_sim só escreve quando o destino responde à identificação do dispositivo (FC 2B/0E) com um nome de fabricante que começa com «PortDock», então não escreve em dispositivos reais atrás do gateway Modbus TCP ↔ RTU do PortDock Serial (127.0.0.1:502 por padrão). O mc_write_sim é verificado só pelo endereço, então, se um programa deste PC repassa para outro dispositivo (um relay TCP, gateway de fabricante, túnel SSH …), uma escrita pode chegar a um dispositivo real — não use as ferramentas de escrita enquanto esse programa estiver em execução.",
    },
    {
      q: "O que ele envia para a rede?",
      a: "O próprio PortDock MCP só fala com os endereços e portas de dispositivos que você informar, e o log de sessão fica neste PC. Os resultados das ferramentas vão para o cliente de IA que você usa, então a partir dali vale a política desse cliente.",
    },
  ],
};
