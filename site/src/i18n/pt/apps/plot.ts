// PortDock Plot — 소개 쪽 글.
export default {
  seo: {
    title: "PortDock Plot: plotter serial grátis ao vivo e CSV",
    desc: "Plotter grátis ao vivo de números por serial, TCP ou UDP: nome:valor estilo Arduino, quadros binários, até 32 canais, cursores e gravação em CSV.",
  },
  summary: "Veja como gráfico ao vivo os números enviados por um Arduino, sensor ou dispositivo. Lê texto separado por vírgula, espaço, tabulação ou ponto e vírgula, «nome:valor» estilo Arduino e quadros binários, com cor e eixo por canal, pausa, zoom e diferenças entre dois pontos, e grava CSV enquanto recebe.",
  who: [
    "Desenvolvedores que ajustam firmware enquanto observam valores de um sensor ou de uma placa",
    "Técnicos de campo que registram por horas a saída de um dispositivo para achar anomalias",
  ],
  features: [
    {
      title: "Serial, TCP e UDP",
      body: "Portas COM (baud rate, bits de dados, paridade, stop bits — 8N1 por padrão — e DTR), um cliente TCP que se conecta ao dispositivo e recepção UDP (inclusive multicast). Reconecta depois de desconectar e reconectar.",
    },
    {
      title: "Texto, nome:valor, binário",
      body: "Vírgula, espaço, tabulação ou ponto e vírgula detectados automaticamente, valores nomeados como temp:23.1 hum:40, linhas de cabeçalho e quadros com bytes de início, u8–f64, endianness e checksum. As linhas com falha aparecem em vermelho com o motivo.",
    },
    {
      title: "Ver e medir",
      body: "Até 32 canais nos eixos esquerdo/direito, últimos N pontos ou segundos, Y automático/fixo, pausa (continua recebendo), leitura por cursor, Δt e Δvalor entre dois marcadores, zoom com a roda e arrastar para mover.",
    },
    {
      title: "Vigilância de canais e alarmes (a partir da 0.10.0)",
      body: "Defina por canal limites inferior/superior, travado por N segundos e dados perdidos por N segundos: as linhas disparadas são destacadas, com uma lista de alarmes, som opcional e um log CSV de alarmes. Um auxílio de monitoramento, não um dispositivo de segurança.",
    },
    {
      title: "Acompanha o ritmo",
      body: "A análise roda em Rust; o desenho acontece uma vez por quadro em um canvas com mínimo/máximo por pixel — milhares de linhas por segundo sem perder os picos.",
    },
    {
      title: "Gravar e salvar",
      body: "Cada valor em CSV enquanto recebe (compatível com o Excel), a faixa visível como CSV, o gráfico como PNG. Tabela do último valor mais mínimo, máximo e média da faixa visível.",
    },
  ],
  steps: [
    "Faça o dispositivo imprimir números por linha (por exemplo, 23.1,40 ou temp:23.1 hum:40)",
    "Escolha a origem (porta serial e baud rate, TCP, UDP) e clique em «Iniciar» (F4)",
    "Clique no gráfico para medir; «● Gravar CSV» para guardá-lo",
  ],
  similar: "Ferramentas parecidas incluem o Serial Plotter da IDE do Arduino e o SerialPlot de código aberto. O PortDock Plot também aceita entrada TCP e UDP e quadros binários, e grava CSV enquanto recebe.",
};
