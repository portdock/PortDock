// PortDock Modbus Slave — 소개 쪽 글. 내장 장비 수가 들어가는 글은 함수.
export default {
  seo: {
    title: "PortDock Modbus Slave: simulador de escravo Modbus grátis",
    desc: "Simulador grátis de escravo Modbus RTU/TCP para Windows: teste um CLP, uma IHM ou um mestre sem o dispositivo, com tabelas, injeção de falhas e perfis.",
  },
  summary: "Transforma o PC em um escravo Modbus (RTU serial, ou servidor Modbus TCP ou RTU sobre TCP) para testar um mestre (CLP, IHM, software supervisório) sem o dispositivo real — inclusive com atrasos e erros propositais.",
  who: [
    "Desenvolvedores que escrevem um mestre Modbus",
    "Equipes que preparam telas de IHM antes de o dispositivo chegar",
  ],
  features: [
    {
      title: "Três meios de transporte",
      body: "Serial (RTU), servidor TCP (Modbus TCP) e servidor TCP (RTU sobre TCP — um dispositivo atrás de um servidor de dispositivos seriais).",
    },
    {
      title: "Quatro tabelas",
      body: "Bobinas, entradas discretas, registradores de retenção e registradores de entrada. Veja uma tabela como U16, S16, HEX ou BIN, defina por célula os tipos U32, S32, F32, F64 ou string com a ordem dos bytes, e deixe os valores mudarem sozinhos (incremento, aleatório, senoidal …).",
    },
    {
      title: "Vários endereços de escravo",
      body: "Execute vários endereços de escravo (1–247), cada um com seus próprios valores.",
    },
    {
      title: "Injeção de falhas",
      body: "Atraso, falta de resposta, CRC quebrado, comprimento MBAP errado ou exceções forçadas — direcionados por endereço de escravo, função, endereço, a cada N requisições ou por probabilidade — para testar os timeouts e as novas tentativas do mestre.",
    },
    {
      title: "Cada escrita à vista",
      body: "As células escritas pelo mestre piscam, com log de tráfego e estatísticas.",
    },
    {
      title: "Perfis de dispositivo, tabelas salvas",
      body: (c: { nDevices: number }) => `Carregue nomes e tipos de registradores de ${c.nDevices} dispositivos incluídos (inversores, controladores de temperatura, medidores de energia …) com valores de exemplo. Exporte e importe tabelas como mapas de registradores CSV (mesmo formato do Modbus Master) ou JSON.`,
    },
    {
      title: "Emular com um perfil de dispositivo — valores ao vivo (a partir da 0.10.0)",
      body: "Teste SCADA, IHM ou o seu próprio programa sem um inversor ou medidor de energia reais. Ao escrever o comando de partida, a frequência de saída sobe até o valor de frequência definido (e desce quando é 0), com corrente, tensão e potência acompanhando; os medidores de energia fazem a tensão e a corrente oscilarem um pouco e acumulam energia. «Regras de ligação» editáveis (seguir, proporcional, acumular) conectam células. As células somente leitura e somente escrita do mapa do dispositivo são respeitadas (exceção 02 ou 03, à sua escolha), endereços não mapeados devolvem a exceção 02, e tudo funciona junto com a injeção de falhas. Os valores vêm das tabelas do manual, então o comportamento real do dispositivo (tempos de rampa etc.) pode ser diferente.",
    },
    {
      title: "Endereço de escuta 127.0.0.1 na primeira execução (a partir da 0.10.0)",
      body: "O «Endereço de escuta» do servidor TCP começa em 127.0.0.1 (só este PC). Para um mestre em outro PC, escolha ali 0.0.0.0 (todas as placas) ou o endereço de uma placa. As configurações salvas por versões anteriores são mantidas.",
    },
  ],
  steps: [
    "Escolha o transporte (serial ou TCP) e a porta e o baud rate (ou o endereço e a porta); acrescente endereços de escravo se precisar",
    "Escolha uma tabela, defina o início e a quantidade e digite os valores",
    "«Conectar» («Iniciar» no TCP) — as requisições do mestre são respondidas a partir da tabela",
  ],
  similar: "Ferramentas parecidas incluem o Modbus Slave comercial (Witte Software) e o ModRSsim2 de código aberto. O PortDock Modbus Slave é grátis (GPL-3.0) e sem limite de tempo.",
};
