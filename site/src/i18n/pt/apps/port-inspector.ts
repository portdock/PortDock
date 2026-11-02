// PortDock Port Inspector — 소개 쪽 글. Windows 화면 이름은 브라질 Windows 표기.
export default {
  seo: {
    title: "PortDock Port Inspector: inspetor de portas COM grátis",
    desc: "Inspetor grátis de portas COM para Windows: driver USB serial, código de problema do Gerenciador de Dispositivos, latência FTDI e COM fantasma. Somente leitura.",
  },
  summary: "Escolha uma porta COM e veja em um só lugar o que você teria de procurar no Gerenciador de Dispositivos, no Visualizador de Eventos e no registro: o driver, o código de problema e seu significado, o chip USB, configurações do dispositivo como o temporizador de latência FTDI, a economia de energia USB, o histórico recente de conexões e as reservas de números COM. Só lê, sem direitos de administrador, e com TX ligado a RX mede o tempo de ida e volta em cada baud rate. Outras abas leem do mesmo modo as placas de rede deste PC, as configurações do Windows como PC de máquina, e o Wi-Fi e o Bluetooth.",
  who: [
    "Técnicos de campo cujo adaptador USB serial não é detectado ou cai de vez em quando",
    "Quem procura o motivo de as respostas Modbus RTU parecerem atrasadas (temporizador de latência FTDI)",
    "Quem precisa anexar os detalhes da porta do PC a um pedido de suporte ou a uma issue",
  ],
  features: [
    {
      title: "Dispositivo, driver, código de problema",
      body: "Nome, número COM, local, ID da instância e fabricante; provedor, versão e data do driver, INF e serviço; status e código de problema do Gerenciador de Dispositivos com seu significado e o que tentar; última conexão e remoção.",
    },
    {
      title: "Chip USB e configurações do dispositivo",
      body: "Nome do chip a partir de uma tabela de VID/PID (FTDI, Prolific PL2303, WCH CH34x, Silicon Labs CP210x …), o padrão do Windows para a porta e os parâmetros do dispositivo do driver, com o temporizador de latência FTDI (LatencyTimer) explicado.",
    },
    {
      title: "Economia de energia e histórico",
      body: "Suspensão seletiva de USB das opções de energia, «Permitir que o computador desligue este dispositivo para economizar energia» para o dispositivo e os dispositivos USB acima dele, e eventos de conexão e de driver dos logs de eventos (7, 30 ou 90 dias).",
    },
    {
      title: "Reservas de números COM",
      body: "Números que o Windows mantém reservados (ComDB), números ocupados por dispositivos não conectados agora, números órfãos e números ocupados por mais de um dispositivo — por que um adaptador novo acaba em COM15.",
    },
    {
      title: "Teste de conexão",
      body: "Um loopback TX–RX por baud rate: bytes iguais, perdidos e alterados, ida e volta de 1 byte em ms (mediana e máximo) e indicadores de erro do driver (ClearCommError). Também diz se um adaptador RS-485 de 2 fios devolve eco.",
    },
    {
      title: "Teste de duas portas e padrões (a partir da 0.10.0)",
      body: "Com dois adaptadores ligados entre si, envia nos dois sentidos em cada velocidade e compara o que chega (para verificar adaptadores RS-485). Padrões: bytes variados, 0x00–0xFF, 0x55/0xAA; comprimento de 64 a 4096 bytes. Diagrama de ligação em texto e um veredito geral «Nenhum problema encontrado (dentro deste teste) / Vale conferir / Problema». O mesmo em «Verificar conexão…» do Serial.",
    },
    {
      title: "Placas de rede deste PC",
      body: "«Ler placas» mostra, para cada placa, link, velocidade, duplex, IPv4 e gateway, além dos valores de «Avançado» do Gerenciador de Dispositivos (jumbo frames, buffers de recepção, moderação de interrupção, EEE …), economia de energia, erros de recepção, perfil de rede e se o firewall dela está ligado. A finalidade «Câmera GigE» mostra os valores publicados pelos fabricantes de câmeras, com as fontes ao lado.",
    },
    {
      title: "Este PC — configurações de PC de máquina",
      body: "«Ler configurações deste PC» lê a inicialização rápida, a suspensão, a suspensão seletiva de USB, a política de reinício de atualizações, a proteção de tela, a sincronização de hora, e os últimos desligamentos inesperados e erros de hardware. Com a finalidade «PC de máquina», os valores que podem causar paradas ou reinícios são marcados como «Vale conferir».",
    },
    {
      title: "Este PC — telas azuis, saúde do SSD, origens de despertar (a partir da 0.10.0)",
      body: "O mesmo cartão «Este PC» lê os códigos de parada de tela azul com seus nomes (por exemplo, 0x50 PAGE_FAULT_IN_NONPAGED_AREA) e os horários de desligamentos repentinos, a temperatura do SSD NVMe, o percentual usado, a reserva, as horas ligado e os erros de mídia, o que despertou o PC da suspensão, e a capacidade da bateria de um notebook em relação ao projeto e o número de ciclos — sem direitos de administrador. Arquivos de despejo são só listados; números de série de discos não são lidos.",
    },
    {
      title: "Comparar com a última vez — verificações salvas (a partir da 0.10.0)",
      body: "Salve a verificação atual (lista de portas COM, nome/versão/data do driver, local USB, configurações das placas de rede, configurações de Este PC, registros de tela azul) e, na próxima manutenção, leia de novo para ver só o que mudou — por exemplo, COM3 → COM7, uma nova versão de driver (Windows Update?), jumbo frames desligados, uma configuração de energia alterada, uma nova tela azul. Números de série de dispositivos, nome do PC e pasta do usuário não são guardados. Guarde o resultado como texto ou CSV.",
    },
    {
      title: "Sem fio — Wi-Fi e Bluetooth",
      body: "A aba «Sem fio» lê o adaptador Wi-Fi, o driver, a economia de energia e os registros de desconexão que o Windows guarda (contados por motivo), além do adaptador Bluetooth, do estado do serviço, dos eventos de erro e de se o áudio Bluetooth está em modo viva-voz (chamadas) — sem direitos de administrador nem permissão de localização. Não envia pings, e as exportações ocultam os nomes dos dispositivos.",
    },
    {
      title: "Somente leitura, resultados claros",
      body: "Nunca altera configurações nem drivers (a ajuda explica as correções manuais). Cada cartão é marcado «Nenhum problema encontrado (no que foi lido) / Vale conferir / Problema / Não foi possível ler»; o que o PC não consegue ver — inversão A/B, terminação, polarização, terra — é sempre listado; as exportações em texto e JSON ocultam os caminhos das pastas do usuário.",
    },
  ],
  steps: [
    "Clique em uma porta na lista «Portas COM» à esquerda",
    "Leia o resultado e o motivo de cada cartão; se precisar, altere o necessário você mesmo no Windows, como a ajuda explica",
    "Ligue TX a RX para o «Teste de conexão»; use «Copiar texto» para anexar o resultado a uma pergunta",
  ],
  similar: "Ferramentas parecidas incluem o Gerenciador de Dispositivos do Windows, o USBDeview da NirSoft (freeware), o USB Device Tree Viewer de Uwe Sieber (freeware) e o FT_PROG da FTDI para chips FTDI (grátis). O PortDock Port Inspector reúne em um só lugar o driver, o código de problema, a economia de energia, o histórico de conexões e as reservas de números COM de uma porta COM, e acrescenta um teste de conexão com loopback.",
};
