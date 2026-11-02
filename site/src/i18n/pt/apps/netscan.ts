// PortDock Net Scan — 소개 쪽 글.
export default {
  seo: {
    title: "PortDock Net Scan: scanner de IP grátis para redes industriais",
    desc: "Scanner de IP grátis para redes industriais: varredura ping e ARP, fabricante pelo MAC, portas industriais (Modbus 502, MC, XGT, S7 …), monitor de ping.",
  },
  summary: "Varra a sub-rede de uma placa de rede para encontrar dispositivos e identifique-os pelo fabricante do MAC e pelas portas industriais abertas (Modbus 502, MC, XGT, S7, EtherNet/IP, OPC UA …). Dispositivos que bloqueiam o ping também são encontrados por ARP na mesma sub-rede.",
  who: [
    "Técnicos de campo que não sabem o IP de um dispositivo novo",
    "Quem precisa vigiar a rede de um dispositivo durante a noite",
  ],
  features: [
    {
      title: "Varredura ping + ARP",
      body: "O ARP na mesma sub-rede encontra dispositivos que bloqueiam o ping; mostra tempo de resposta, nome, este PC e o gateway. Não exige direitos de administrador.",
    },
    {
      title: "Verificação de portas industriais",
      body: "Verifica apenas uma lista de portas (padrão 502, 2004, 5000–5010, 102, 44818, 4840 …; editável, até 32) — sem varredura geral de portas — e pergunta aos dispositivos Modbus pelo fabricante e modelo (FC 2B/0E).",
    },
    {
      title: "Avisos de exposição (a partir da 0.10.0)",
      body: "Se Modbus 502, MC 5006/5007, EtherNet/IP 44818, S7 102, OPC UA 4840, Telnet 23 ou HTTP 80 estiver entre as portas já verificadas, acrescenta um aviso como «Protocolo industrial aberto — qualquer pessoa na mesma rede pode ler e escrever (sem autenticação) — verifique a separação de redes». Não varre portas extras e não altera configurações de nenhum dispositivo.",
    },
    {
      title: "Descoberta por broadcast — EtherNet/IP, BACnet (a partir da 0.11.0)",
      body: "Somente quando você clica, envia EtherNet/IP ListIdentity (UDP 44818) e BACnet Who-Is (UDP 47808) ao endereço de broadcast do adaptador escolhido e inclui na tabela o fabricante, o tipo de dispositivo, o nome do produto e a revisão — e a instância do dispositivo e o ID do fabricante BACnet — dos dispositivos cujo IP você não conhece. São requisições somente leitura; números de série não são mostrados.",
    },
    {
      title: "Fabricante pelo MAC",
      body: "A lista IEEE incorporada mostra o fabricante sem acesso à internet.",
    },
    {
      title: "Monitor de ping de longo prazo",
      body: "Registra em CSV a perda, a latência e as quedas de vários dispositivos e faz a barra de tarefas piscar quando há uma queda.",
    },
    {
      title: "Novos / ausentes",
      body: "Compara com a varredura anterior para marcar dispositivos novos e ausentes. Exporta para CSV.",
    },
    {
      title: "Referências — comparar com a última vez (a partir da 0.10.0)",
      body: "Salve a lista de dispositivos como referências com nome (várias, também como arquivos JSON) e compare com uma delas a próxima varredura — novos (adicionados?), ausentes (removidos ou desligados?), MAC alterado (outro dispositivo no mesmo IP, substituído?), IP alterado (o mesmo dispositivo em outro IP, DHCP?) e portas abertas alteradas, com cores. CSV de comparação e cópia para «AI» (últimos 3 bytes do MAC ocultos). Os arquivos de referência contêm endereços MAC — cuidado ao compartilhar.",
    },
    {
      title: "Wake-on-LAN, abrir a web",
      body: "Por dispositivo: abrir a página web, copiar IP/MAC e enviar um pacote mágico.",
    },
  ],
  steps: [
    "Escolha uma placa de rede — a sub-rede dela vira a faixa (o /24 em que está, se for maior)",
    "«Varrer» (F4)",
    "Confira as colunas de serviços e fabricante; clique em um dispositivo para abrir a página web, copiar o IP, acordá-lo ou «Adicionar ao monitor de ping»",
  ],
  similar: "Ferramentas parecidas incluem o Angry IP Scanner (código aberto) e o Advanced IP Scanner (freeware). O PortDock Net Scan acrescenta a verificação de portas industriais (Modbus 502, MC, XGT, S7 …) e o monitor de ping de longo prazo.",
};
