// Textos da árvore de perguntas do assistente de diagnóstico (português do Brasil). A forma da árvore (id, próximo nó, links) é a de data/troubleshoot.ts, comum a todos os idiomas; aqui só os textos por id de nó.
// Pergunta: q · hint (só se a árvore tiver dica) · opts (só respostas que não são sim/não). Resultado: title · causes · checks (mesmo número e ordem da árvore). São «causas possíveis», nunca uma causa confirmada.
import type { TreeText } from "../../lib/troubleshoot.ts";

export default {
  yes: "Sim",
  no: "Não",
  symptoms: {
    rs485: "RS-485 / Modbus RTU: sem resposta ou com bytes corrompidos",
    rs232: "RS-232 não comunica",
    tcp: "Equipamento Modbus TCP / Ethernet não conecta",
    usb: "Adaptador USB-serial não é detectado ou cai",
    ma: "A leitura de 4–20 mA parece errada",
    sensor: "A entrada do sensor NPN/PNP não aparece",
    mc: "O protocolo MC (Mitsubishi) não conecta",
    pcusb: "Um dispositivo USB do PC fica desconectando",
  },
  nodes: {
    "rs485-any": { q: "Não chega nenhuma resposta?", hint: "«Não» = as respostas chegam às vezes, ou chegam com bytes corrompidos" },
    "rs485-txled": { q: "O LED TX do adaptador pisca quando uma requisição é enviada?", hint: "Sem LED? Confira, em vez disso, se os bytes enviados aparecem no log do PortDock Serial" },
    "rs485-settings": { q: "Você comparou um a um o baud rate, a paridade, os stop bits e o endereço do escravo com a tela de configuração do próprio equipamento (ou o manual)?" },
    "rs485-swap": { q: "Se você trocar os fios A e B (D+/D−), chega resposta?", hint: "Trocá-los não danifica os equipamentos" },
    "rs485-single": { q: "Com só um equipamento ligado direto ao adaptador por um cabo curto, ele responde?" },
    "rs485-garbled": { q: "Os bytes recebidos parecem corrompidos (erros de CRC, caracteres estranhos)?", hint: "«Não» = os bytes parecem certos, mas às vezes faltam respostas (timeouts)" },
    "rs485-slower": { q: "Reduzir o baud rate ou encurtar o cabo diminui a corrupção?" },
    "rs485-timeout": { q: "Um timeout de resposta maior (ex.: 1000 ms) diminui as respostas que faltam?" },
    "r-rs485-port": {
      title: "A requisição nem sai do PC — lado da porta ou do driver",
      causes: [
        "O número de COM aberto está errado (ele muda quando o adaptador vai para outra porta USB)",
        "Outro programa (SCADA, um terminal usado antes) ainda está com a porta",
        "Problema de driver (sinal de alerta ou código de problema no Gerenciador de Dispositivos)",
        "O adaptador não troca de sentido automaticamente para RS-485 a 2 fios",
      ],
      checks: [
        "Encontre o número de COM do adaptador em «Portas (COM e LPT)» no Gerenciador de Dispositivos e acerte a configuração do programa",
        "Leia o driver e o código de problema da porta no Port Inspector e rode o teste de eco de RS-485 a 2 fios para ver se algo é transmitido",
        "Com o multímetro (V⎓) entre A e B, enviar requisições repetidamente deve fazer a leitura pular — se ela ficar parada, nada é transmitido",
      ],
    },
    "r-rs485-settings": {
      title: "A configuração de comunicação provavelmente difere",
      causes: [
        "O baud rate ou a paridade diferem (ex.: equipamento 8E1, programa 8N1)",
        "O endereço do escravo difere, ou está sendo usado o 0 (broadcast) — broadcasts não têm resposta",
        "O protocolo do equipamento não é Modbus RTU (protocolo do fabricante ou ASCII), ou a configuração foi mudada sem salvar e reiniciar",
      ],
      checks: [
        "Anote os parâmetros de comunicação da tela do equipamento e compare linha a linha com o programa",
        "Em inversores, confira também os parâmetros de «origem do comando de partida» e «seleção de protocolo»",
        "Se o baud rate for desconhecido, faça uma varredura com o Modbus Master — varredura de endereços de escravo, e baud rate/paridade com a «busca de configuração da linha» (a partir da 0.10.0)",
      ],
    },
    "r-rs485-polarity": {
      title: "A identificação A/B (+/−) estava invertida",
      causes: [
        "Os fabricantes discordam sobre qual de A/B é o + (a especificação Modbus diz D1 = B = +, D0 = A = −)",
        "Só alguns equipamentos podem estar invertidos — se outros pararem de responder depois da troca, confira as marcações deles",
      ],
      checks: [
        "Ligado, com o polling parado: vermelha em B (D1·+), preta em A (D0·−) deve ler +200 mV ou mais quando há polarização",
        "Registre a troca no diagrama de ligação para ninguém desfazê-la",
      ],
    },
    "r-rs485-bus": {
      title: "Um equipamento sozinho funciona, mas não no barramento — fiação ou topologia do barramento",
      causes: [
        "Três ou mais terminações (a chave de um equipamento do meio ligada), ou nenhuma",
        "Dois equipamentos com o mesmo endereço de escravo respondem juntos e se corrompem",
        "Derivações longas ou ligação em estrela, ou um rompimento num borne intermediário",
        "Sem fio SG (comum), o que deixa equipamentos distantes fora da faixa de modo comum",
      ],
      checks: [
        "Tudo desligado, resistência A–B: cerca de 60 Ω (duas pontas), cerca de 120 Ω (uma ponta), de centenas de Ω a vários kΩ ou mais (nenhuma — muitos equipamentos ou resistores de polarização visíveis baixam para perto de 1 kΩ), 40 Ω ou menos (terminações demais). A terminação RC (1 nF + 120 Ω) é invisível em CC e aparece como «nenhuma»",
        "Ligado: A–SG e B–SG entre −7 e +12 V",
        "Recoloque os equipamentos um a um para ver onde falha; liste todos os endereços de escravo",
      ],
    },
    "r-rs485-device": {
      title: "Falha mesmo com um só equipamento — configuração do equipamento, porta de comunicação ou adaptador",
      causes: [
        "A configuração do equipamento não foi salva, ou só vale depois de reiniciar",
        "A comunicação fica num cartão opcional ou em outros bornes, ou há uma configuração de modo 2/4 fios",
        "Adaptador com defeito, ou ligado nos bornes de RS-422/RS-232 em vez de RS-485",
      ],
      checks: [
        "Teste o adaptador sozinho com o teste de eco de RS-485 a 2 fios do Port Inspector",
        "Teste o mesmo equipamento com outro adaptador ou outro PC",
        "Procure no manual do equipamento os números dos bornes de comunicação e quando a nova configuração passa a valer",
      ],
    },
    "r-rs485-signal": {
      title: "Qualidade do sinal — reflexões, ruído, comprimento",
      causes: [
        "Sem terminação ou só numa ponta — reflexões em linhas longas e rápidas",
        "Cabo longo demais para o baud rate (aproximadamente baud × metros ≤ 10^8)",
        "Não é par trançado, corre junto com cabos de potência, ou a blindagem não está aterrada",
      ],
      checks: [
        "Desligado: A–B cerca de 60 Ω",
        "Modo comum A–SG e B–SG entre −7 e +12 V, também com os motores funcionando",
        "Confira o limite de comprimento para este baud rate na calculadora de RS-485",
      ],
    },
    "r-rs485-framing": {
      title: "Quadros desalinhados — configuração, eco ou divisão",
      causes: [
        "Baud rate ou paridade levemente diferentes (alguns bytes ainda podem parecer certos)",
        "Um adaptador a 2 fios devolve o eco da requisição, que aparece na frente da resposta",
        "A latência do USB divide uma resposta em duas e o receptor as analisa separadamente",
      ],
      checks: [
        "Cole os bytes recebidos no decodificador de quadros Modbus e confira endereço, função e CRC",
        "Confira o eco do adaptador e o latency timer da FTDI no Port Inspector",
      ],
    },
    "r-rs485-timing": {
      title: "Tempos apertados demais — timeout, intervalo de polling, latência do USB",
      causes: [
        "Timeout menor que o tempo de resposta do equipamento (inversores e medidores podem levar de dezenas a centenas de ms)",
        "A requisição seguinte é enviada cedo demais e se sobrepõe à resposta anterior",
        "O latency timer do adaptador USB (16 ms por padrão na FTDI) se soma a cada quadro curto",
      ],
      checks: [
        "Calcule o tempo de requisição/resposta e o timeout mínimo com a calculadora de tempos da comunicação serial",
        "Leia o valor do latency timer com o Port Inspector",
      ],
    },
    "r-rs485-idle": {
      title: "A linha flutua em repouso ou as respostas colidem — polarização ou endereços",
      causes: [
        "Sem resistores de polarização (fail-safe), o ruído em repouso é lido como bytes",
        "Dois equipamentos com o mesmo endereço colidem de vez em quando",
        "Ruído só com motores ou inversores funcionando (blindagem, terra)",
      ],
      checks: [
        "Ligado, com o polling parado: diferencial B–A de +200 mV ou mais",
        "Coloque todos os equipamentos e endereços num diagrama do sistema para achar repetições",
        "Compare quando as respostas falham com quando os motores funcionam",
      ],
    },
    "rs232-seen": { q: "A porta COM aparece no Gerenciador de Dispositivos do PC?", hint: "Com um adaptador USB-RS232, «Não» continua no ramo de detecção do adaptador" },
    "rs232-loop": { q: "Com os pinos 2 (RXD) e 3 (TXD) do DB9 do lado do PC unidos (loopback), os caracteres enviados voltam?" },
    "rs232-cross": { q: "O TX do equipamento está ligado ao RX do PC (pino 2) e o TX do PC (pino 3) ao RX do equipamento — cruzados?", hint: "Não tem certeza? Escolha «Não» para ver como verificar" },
    "rs232-flow": { q: "O controle de fluxo está em «Nenhum» tanto no programa quanto no equipamento?" },
    "r-rs232-pc": {
      title: "Bloqueado na porta do PC ou no adaptador",
      causes: [
        "Outro programa está com a porta, ou o número de COM aberto está errado",
        "Adaptador ou porta com defeito, problema de driver",
        "Pinos errados unidos (o loopback é entre os pinos 2 e 3)",
      ],
      checks: [
        "Em repouso, do pino 3 (TXD) ao pino 5 (GND) a leitura é de −5 a −15 V (de −3 a −5 V é fraco — vale conferir)",
        "Rode o teste de loopback do Port Inspector e confira se os bytes voltam em cada baud rate",
      ],
    },
    "r-rs232-cross": {
      title: "O TX pode estar ligado ao TX — cabo cruzado ou direto",
      causes: [
        "O PC e o equipamento são ambos DTE, mas está sendo usado um cabo direto (TX–TX) — é preciso um cabo null modem (cruzado)",
        "Ou o equipamento é DCE e está sendo usado um cabo cruzado",
      ],
      checks: [
        "Em cada conector, o pino que mostra de −5 a −15 V em repouso (de −3 a −5 V se fraco) é o TX daquele lado — se os dois TX estiverem no mesmo fio, estão em conflito",
        "Use o modo de continuidade ao longo do cabo para ver se 2↔3 estão cruzados",
      ],
    },
    "r-rs232-flow": {
      title: "Controle de fluxo diferente",
      causes: [
        "O controle de fluxo por hardware (RTS/CTS) está ligado, mas o CTS não está ligado no cabo, então o PC espera para sempre",
        "O equipamento precisa de DTR/DSR ativos, mas está sendo usado um cabo de só 3 fios",
      ],
      checks: [
        "Coloque o controle de fluxo em «Nenhum» no programa e teste de novo",
        "Se o equipamento exigir handshake, una RTS–CTS (7–8) e DTR–DSR–DCD (4–6–1) dentro do conector, ou use um cabo com handshake completo",
      ],
    },
    "r-rs232-settings": {
      title: "A ligação parece certa — configuração, formato de comando ou nível de sinal",
      causes: [
        "Baud rate, bits de dados, paridade ou stop bits diferem",
        "O fim de linha (CR, LF, CR LF) ou o checksum difere do que o equipamento espera",
        "A porta do equipamento é uma UART TTL (3,3/5 V), não RS-232",
      ],
      checks: [
        "Se o TX do equipamento fica em +3,3 ou +5 V em repouso, é TTL — não ligue direto numa porta RS-232",
        "Envie e receba em HEX e compare fins de linha e checksums byte a byte",
      ],
    },
    "tcp-ping": { q: "O equipamento responde ao ping do PC?" },
    "tcp-subnet": { q: "Os IPs do PC e do equipamento estão na mesma sub-rede? (ex.: 192.168.0.10/24 e 192.168.0.50)" },
    "tcp-link": { q: "Os LEDs de link estão acesos nas portas LAN do PC e do equipamento (ou do switch)?" },
    "tcp-502": { q: "Você consegue abrir uma conexão TCP na porta 502 (ou na porta do manual)?", hint: "Tente conectar com o PortDock TCP, ou com PowerShell Test-NetConnection <IP> -Port 502" },
    "tcp-reply": { q: "Depois de conectado, uma requisição recebe resposta?" },
    "tcp-exception": { q: "A resposta é uma exceção (código de função + 0x80, ex.: 83 02)?", hint: "«Não» = as respostas chegam, mas os valores parecem errados" },
    "r-tcp-subnet": {
      title: "Sub-redes IP diferentes",
      causes: [
        "As partes de rede diferem, então eles não se alcançam sem um gateway",
        "O IP do equipamento é desconhecido (padrão de fábrica ou DHCP)",
      ],
      checks: [
        "Informe os dois IPs e máscaras na calculadora de sub-rede para ver se estão na mesma sub-rede",
        "Acrescente ao adaptador do PC um segundo IP na sub-rede do equipamento (ex.: 192.168.0.200/24)",
        "Se o IP for desconhecido, encontre-o com o Net Scan",
      ],
    },
    "r-tcp-link": {
      title: "Sem link físico — cabo, porta ou switch",
      causes: [
        "Cabo ou conector rompido, ou ligado em outra porta",
        "Switch desligado ou com a porta desativada, ou a porta LAN do equipamento desativada",
      ],
      checks: [
        "Troque o cabo e a porta do switch",
        "Leia link, velocidade e duplex com «Ler adaptadores» do Port Inspector",
      ],
    },
    "r-tcp-noping": {
      title: "Há link, mas o ping não responde",
      causes: [
        "O equipamento está configurado para não responder ao ping (ICMP) — teste a conexão na 502 diretamente",
        "Dois equipamentos com o mesmo IP (conflito de endereço)",
        "Outro adaptador do PC (ex.: Wi-Fi) está na mesma sub-rede e o tráfego sai por ele; firewall",
      ],
      checks: [
        "Desconecte o equipamento e dê ping — se houver resposta, outro equipamento tem esse IP",
        "Varra a sub-rede com o Net Scan para ver IPs e MACs; procure IPs repetidos num diagrama do sistema",
        "Desative temporariamente os outros adaptadores e tente de novo",
      ],
    },
    "r-tcp-port": {
      title: "O ping funciona, mas a porta 502 recusa",
      causes: [
        "O Modbus TCP está desativado no equipamento ou é opcional (cartão ou licença à parte)",
        "A porta não é a 502",
        "O limite de conexões está cheio (SCADA ou IHM já conectados)",
      ],
      checks: [
        "Confira no manual a configuração do Modbus TCP, a porta e o máximo de conexões",
        "Desconecte os outros clientes por um momento e reconecte",
      ],
    },
    "r-tcp-unitid": {
      title: "Conectado, mas sem resposta — Unit ID ou gateway",
      causes: [
        "Unit ID errado — atrás de um gateway ele precisa ser o endereço do escravo RTU; em equipamentos diretos use o valor do manual (1 ou 255 são comuns)",
        "O lado RTU do gateway (baud rate, ligação) falha — ele descarta a requisição ou devolve a exceção 0B",
        "Um código de função que o equipamento não suporta",
      ],
      checks: [
        "Decodifique os bytes trocados no decodificador de quadros Modbus para ver o MBAP e o Unit ID",
      ],
    },
    "r-tcp-exception": {
      title: "O equipamento responde com exceção — endereço, função ou quantidade",
      causes: [
        "Exceção 02: endereço inexistente — notação 40001 não convertida para endereço base 0 (deslocado em um)",
        "Exceção 01: função não suportada (ex.: ler registradores de entrada com a 03)",
        "Exceção 03: quantidade acima de 125 ou do limite do equipamento",
      ],
      checks: [
        "Cole a resposta no decodificador de quadros Modbus para ver o significado da exceção",
        "Confira se o mapa de registradores usa endereços base 0 ou base 1",
      ],
    },
    "r-tcp-values": {
      title: "A comunicação funciona, mas os valores parecem errados — formato, ordem ou escala",
      causes: [
        "A ordem das words dos valores de 32 bits (float, int32) difere (ABCD, CDAB …)",
        "Escala (×0,1, ×0,01), sinal (int16/uint16) ou relação do TC não aplicados",
        "Endereço deslocado em um (base 0 ou base 1)",
      ],
      checks: [
        "Coloque os dois registradores no conversor de float Modbus e compare as quatro ordens",
        "Compare com sinal e sem sinal no conversor de inteiros",
      ],
    },
    "usb-sound": { q: "Ao conectar o adaptador, o Windows toca o som de conexão ou o Gerenciador de Dispositivos muda?" },
    "usb-com": { q: "Ele aparece em «Portas (COM e LPT)» com um número de COM?", hint: "«Não» = aparece em «Outros dispositivos», com sinal de alerta ou como desconhecido" },
    "usb-drops": { q: "Ele cai durante o uso (a porta some e volta)?" },
    "usb-motor": { q: "Ele cai quando cargas grandes como motores, inversores ou máquinas de solda partem ou funcionam?" },
    "usb-comnum": { q: "O número de COM muda a cada conexão, ou pula para números altos como COM15?", hint: "«Não» = é detectado e conecta, mas a comunicação é lenta ou as respostas chegam divididas" },
    "r-usb-none": {
      title: "Nem aparece como dispositivo USB — cabo, porta ou adaptador",
      causes: [
        "Um cabo USB só de carga (sem os fios de dados)",
        "Problema de conexão ou de alimentação na porta frontal ou no hub",
        "Adaptador com defeito",
      ],
      checks: [
        "Conecte direto numa porta traseira, sem hub, com outro cabo",
        "Veja se em outro PC acontece o mesmo",
        "Confira se a conexão aparece no registro de conexões/desconexões USB do Hardware Tester (a partir da 0.10.0)",
      ],
    },
    "r-usb-driver": {
      title: "Falta o driver ou o dispositivo não consegue iniciar",
      causes: [
        "Nenhum driver instalado para o chip (FTDI, CH34x, CP210x, PL2303)",
        "O driver recusa o chip (código 10 etc.) — comum com PL2303 antigos",
      ],
      checks: [
        "Leia VID:PID, o nome do chip e o código de problema com o significado no Port Inspector",
        "Use o driver do site do fabricante do chip (peça à TI se forem necessários direitos de administrador)",
      ],
    },
    "r-usb-emi": {
      title: "Ruído ou diferença de terra entrando no USB",
      causes: [
        "Com um adaptador não isolado, a diferença de potencial entre o terra do equipamento e o do PC reinicia o USB",
        "O cabo de comunicação ou USB corre junto com cabos de potência",
      ],
      checks: [
        "Tensão entre a carcaça USB do PC e o SG/PE do equipamento (V⎓ e V~): abaixo de 1 V é o comum; 7 V ou mais é problema",
        "Experimente um adaptador isolado, um cabo USB mais curto ou ferrites",
        "Compare os horários de queda do USB no Hardware Tester com os horários de funcionamento dos motores (a partir da 0.10.0)",
      ],
    },
    "r-usb-power": {
      title: "Economia de energia, alimentação ou contato",
      causes: [
        "Suspensão seletiva de USB, ou «Permitir que o computador desligue o dispositivo para economizar energia»",
        "Um hub alimentado pelo barramento com alimentação insuficiente, ou um conector frouxo",
      ],
      checks: [
        "Leia as configurações de economia de energia e o histórico recente de conexões com o Port Inspector (somente leitura — mude-as você mesmo no Windows)",
        "Veja se mexer no cabo provoca uma queda",
      ],
    },
    "r-usb-comnum": {
      title: "O número de COM muda — posição da porta, número de série, reservas",
      causes: [
        "Chips sem número de série (CH34x etc.) recebem um número novo em cada porta USB",
        "Dispositivos conectados antes mantêm números reservados (ComDB)",
      ],
      checks: [
        "Use sempre a mesma porta USB",
        "Veja as reservas de números de COM no Port Inspector",
        "O PortDock Serial reabre o mesmo dispositivo mesmo que o número dele mude",
      ],
    },
    "r-usb-latency": {
      title: "Conectado, mas lento ou com respostas divididas — latência do USB",
      causes: [
        "O latency timer da FTDI (16 ms por padrão) acrescenta atraso a cada quadro curto",
        "O programa trata cada fragmento como uma resposta separada",
        "Se não houver comunicação nenhuma, siga pelo ramo de RS-485 ou RS-232",
      ],
      checks: [
        "Confira o latency timer e o tempo de ida e volta do loopback no Port Inspector",
        "Compare com o tempo de resposta esperado da calculadora de tempos da comunicação serial",
      ],
    },
    "ma-kind": { q: "Como o valor parece errado?", opts: ["Parado em 0 (ou no mínimo)", "Parado no máximo", "Oscilando ou pulando", "Varia, mas não bate com a realidade"] },
    "ma-flow": { q: "Com um multímetro (mA) em série no loop, circulam mais de 3,6 mA?" },
    "ma-volt": { q: "Há tensão (normalmente 10 V ou mais) entre os bornes + e − do transmissor?" },
    "ma-high": { q: "A corrente medida é de 21 mA ou mais?" },
    "ma-motor": { q: "A oscilação aumenta com motores ou inversores funcionando?" },
    "ma-loopv": { q: "Perto de 20 mA, a tensão nos bornes do transmissor ainda fica acima da tensão mínima de operação do manual dele?" },
    "r-ma-open": {
      title: "Nem corrente nem tensão no loop — circuito aberto ou alimentação",
      causes: [
        "Fio rompido, borne frouxo ou fusível",
        "Fonte do loop (24 V) desligada ou ligada em outro lugar",
        "Um transmissor a 4 fios (alimentação separada) ligado como um de 2 fios, então ele não recebe alimentação",
      ],
      checks: [
        "Meça os 24 V na fonte e depois no transmissor para achar onde desaparecem",
        "Compare a ligação real com os desenhos de 2/3/4 fios",
      ],
    },
    "r-ma-tx": {
      title: "Há tensão, mas não há corrente — transmissor ou polaridade",
      causes: [
        "Polaridade invertida a 2 fios (+ e − trocados)",
        "A entrada receptora está em modo tensão, o que na prática abre o loop",
        "Transmissor com defeito",
      ],
      checks: [
        "Confira de novo o + e o − do transmissor com o desenho do manual",
        "Confira a configuração ou o jumper do tipo de canal (corrente/tensão) do cartão de entradas",
      ],
    },
    "r-ma-input": {
      title: "A corrente circula, mas o valor é 0 — configuração do lado receptor ou escala",
      causes: [
        "Faixa de entrada configurada de outro jeito (0–20 mA, 1–5 V, 0–10 V)",
        "Está olhando outro canal, ou o escalonamento está em 0",
        "Com 3,6 mA ou menos o transmissor está sinalizando falha NE 43 (3,6–3,8 mA é abaixo da faixa, não sinal de falha)",
      ],
      checks: [
        "Informe os mA medidos no verificador do multímetro para ver o % e a zona NE 43",
        "Compare com a contagem esperada (ex.: 0–27648) na calculadora de 4–20 mA",
      ],
    },
    "r-ma-fault-high": {
      title: "21 mA ou mais — sinal de falha ou curto",
      causes: [
        "O transmissor está dando o sinal de falha alto da NE 43 (ex.: sensor rompido)",
        "Bem acima de 25 mA: a fonte contorna o transmissor (curto)",
      ],
      checks: [
        "Confira o display ou o diagnóstico do transmissor",
        "Meça a resistência do sensor (ex.: Pt100) para ver se está aberto",
      ],
    },
    "r-ma-over": {
      title: "Parado no máximo — configuração da faixa ou valor real",
      causes: [
        "A faixa de escalonamento do CLP é mais estreita que a do transmissor",
        "O valor de processo passa da faixa do transmissor (ex.: 0–10 bar)",
        "Confusão de unidades (bar, psi, kPa)",
      ],
      checks: [
        "Calcule o % a partir dos mA medidos e compare com o valor do CLP",
        "Confira a faixa na plaqueta ou na configuração do transmissor",
      ],
    },
    "r-ma-noise": {
      title: "Ruído — blindagem, terra ou caminho do cabo",
      causes: [
        "O cabo de sinal divide a eletrocalha com cabos de potência",
        "Blindagem aterrada nas duas pontas, formando um loop de terra (normalmente só numa ponta)",
        "Diferença de potencial de terra entre o transmissor e o CLP",
      ],
      checks: [
        "Meça a tensão entre os dois terras (abaixo de 1 V é o comum)",
        "Registre a oscilação em mA; considere um isolador de sinal",
        "Reduza a oscilação com uma constante de tempo de filtro de entrada (filtro RC)",
      ],
    },
    "r-ma-loadv": {
      title: "Tensão do loop baixa demais — resistência de carga ou queda da fonte",
      causes: [
        "Receptores, indicadores ou barreiras demais no loop",
        "Fiação longa ou fina, queda na fonte de 24 V",
      ],
      checks: [
        "Use a calculadora de carga do loop para ver a tensão do transmissor a 20 mA (ou 21 mA)",
        "Meça a fonte de 24 V com carga (queda de 5 % ou menos é tranquila)",
      ],
    },
    "r-ma-process": {
      title: "Fiação e tensão parecem certas — variação real do processo ou amortecimento",
      causes: [
        "O valor de processo realmente oscila (pulsação de bomba etc.)",
        "Amortecimento do transmissor ou filtro de entrada do CLP curto demais",
      ],
      checks: [
        "Registre o valor num gráfico de tempo e procure padrões periódicos",
        "Confira a configuração de amortecimento do transmissor",
      ],
    },
    "r-ma-scale": {
      title: "O valor não bate com a realidade — escalonamento, unidades ou contagens",
      causes: [
        "A faixa de engenharia (mínimo/máximo) difere da configuração do transmissor",
        "Faixa de contagem do CLP errada (0–27648, 0–4000, 0–32000)",
        "Confusão de unidades (bar/psi, manométrica/absoluta)",
      ],
      checks: [
        "Informe os mA medidos na calculadora de 4–20 mA e compare com o valor e a contagem esperados",
        "Confira se o valor do CLP é proporcional em 4, 12 e 20 mA",
      ],
    },
    "sn-kind": { q: "Qual é o sintoma?", opts: ["A entrada nunca liga", "A entrada nunca desliga (sempre ligada)"] },
    "sn-led": { q: "O LED indicador do próprio sensor acende quando há um alvo?" },
    "sn-power": { q: "A tensão entre o marrom (+) e o azul (0 V) do sensor está perto da fonte (normalmente 24 V)?" },
    "sn-type": { q: "O tipo de sensor e o COM das entradas do CLP combinam — COM em +24 V para NPN, em 0 V para PNP?", hint: "Não tem certeza? Escolha «Não»" },
    "sn-vin": { q: "Com o sensor ativo, há 15 V ou mais entre o borne de entrada do CLP e o COM das entradas?" },
    "sn-plcled": { q: "O LED da entrada do CLP acende nesse momento?" },
    "r-sn-power": {
      title: "Não chega alimentação ao sensor",
      causes: [
        "Fio de alimentação rompido, contato do conector ou fusível",
        "As cores dos fios fogem da convenção (marrom +, azul 0 V, preto saída)",
        "Queda de tensão até um sensor distante",
      ],
      checks: [
        "Meça a tensão de alimentação no sensor com as cargas ligadas — queda acima de 15 % é problema",
        "Confira as cores dos fios e a faixa de alimentação na folha de dados do sensor",
      ],
    },
    "r-sn-sense": {
      title: "Alimentado, mas não detecta — ajuste do sensor ou alvo",
      causes: [
        "Distância de detecção ou sensibilidade, material do alvo (o alcance do indutivo depende do tipo de metal)",
        "Sensor fotoelétrico desalinhado ou com a lente suja",
        "Sensor com defeito",
      ],
      checks: [
        "Aproxime o alvo para ver a que distância o LED acende",
        "Troque por um sensor do mesmo tipo",
      ],
    },
    "r-sn-mismatch": {
      title: "NPN/PNP e a polaridade do COM das entradas podem não combinar",
      causes: [
        "Sensor NPN com o COM das entradas em 0 V (ou PNP com +24 V) — a corrente não tem caminho",
        "Os fabricantes usam «sink/source» em sentidos opostos",
      ],
      checks: [
        "Com o sensor ativo, preto–azul lê perto de 0 V no NPN e perto da alimentação no PNP",
        "Confira no desenho de ligação das entradas do manual do CLP para onde vai o COM",
      ],
    },
    "r-sn-wire": {
      title: "O sensor liga, mas a tensão não chega à entrada — fiação",
      causes: [
        "Fio de saída ligado em outra entrada, ou rompido numa régua de bornes intermediária",
        "Falta o fio do COM das entradas",
        "Tensão residual do sensor alta, ou corrente de saída baixa demais para a entrada",
      ],
      checks: [
        "Meça preto–azul com o sensor ativo e desativado e informe os dois valores no verificador",
        "Entrada do CLP até o COM: ON 15 V ou mais (tipo 1), OFF 5 V ou menos",
      ],
    },
    "r-sn-input": {
      title: "A tensão chega, mas o CLP não lê ON — cartão de entradas",
      causes: [
        "Alimentação ou defeito do cartão de entradas, ou está olhando outro slot",
        "Tensão de entrada perto do limiar (11–15 V) — uma entrada tipo 1 pode continuar desligada",
      ],
      checks: [
        "Passe o sensor para um canal vizinho",
        "Confira a tensão e a corrente de ON no manual do cartão de entradas",
      ],
    },
    "r-sn-program": {
      title: "A entrada liga, sim — endereço, filtro ou duração do pulso",
      causes: [
        "O programa lê outro endereço de entrada (numeração X em octal ou hexadecimal)",
        "Sinal mais curto que o tempo de filtro da entrada (alvo passando rápido)",
        "Se for lido por comunicação, o cálculo do endereço de bit está errado",
      ],
      checks: [
        "Observe esse bit de entrada diretamente no monitor do CLP",
        "No protocolo MC, confira a notação do número do dispositivo",
      ],
    },
    "r-sn-stuck": {
      title: "A entrada nunca desliga — fuga, curto ou modo de saída",
      causes: [
        "A fuga no estado OFF de um sensor a 2 fios mantém a entrada ligada",
        "Fio de saída em curto com +24 V (PNP) ou 0 V (NPN)",
        "Modo de saída do sensor (NA/NF, light-on/dark-on) invertido",
      ],
      checks: [
        "Com o sensor desativado, a entrada do CLP até o COM deve ter 5 V ou menos",
        "Veja se a entrada desliga ao soltar o fio de saída",
      ],
    },
    "mc-ping": { q: "O CLP responde ao ping do PC?", hint: "«Não» continua no ramo de Ethernet (sub-rede IP)" },
    "mc-port": { q: "Há uma conexão de protocolo MC (SLMP) aberta na configuração Ethernet do CLP, com número de porta, TCP/UDP e binário/ASCII iguais aos do programa?" },
    "mc-endcode": { q: "O código de término da resposta é diferente de zero (ex.: C059)?" },
    "mc-noreply": { q: "A conexão está aberta, mas nenhuma resposta chega (timeout)?", hint: "«Não» = as respostas chegam, mas os valores parecem errados" },
    "r-mc-port": {
      title: "Configuração da conexão do protocolo MC no CLP",
      causes: [
        "Nenhuma conexão de protocolo MC (SLMP) configurada, ou a configuração não foi gravada no CLP e reiniciada",
        "Número de porta, TCP/UDP ou código (binário/ASCII) diferente do programa",
        "Outro programa já usa a mesma conexão TCP",
      ],
      checks: [
        "Teste primeiro o lado do programa com o PortDock PLC Simulator em 127.0.0.1, sem CLP",
        "Anote a configuração Ethernet da ferramenta de engenharia ao lado dos valores do programa e compare",
      ],
    },
    "r-mc-endcode": {
      title: "O CLP recusa a requisição com um código de término",
      causes: [
        "Comando ou subcomando não suportado pelo modelo de CLP",
        "Código ou número de dispositivo fora da faixa, ou pontos demais",
        "Configurações do lado do CLP, como proteção contra escrita em RUN",
      ],
      checks: [
        "Cole a resposta no decodificador do protocolo MC para ver o significado do código de término",
        "Siga a ordem de verificação do guia de códigos de término",
      ],
    },
    "r-mc-frame": {
      title: "O formato do quadro não combina, então o CLP fica em silêncio",
      causes: [
        "Quadro 3E/4E ou binário/ASCII diferente da configuração do CLP",
        "Valores do cabeçalho (nº da rede, nº do PC, módulo de destino) ou tamanho dos dados errados",
        "Usando UDP quando o CLP espera TCP (ou o contrário)",
      ],
      checks: [
        "Decodifique campo a campo os bytes enviados no decodificador do protocolo MC",
      ],
    },
    "r-mc-values": {
      title: "As respostas chegam, mas os valores parecem errados — números de dispositivo ou unidades",
      causes: [
        "X e Y são hexadecimais, mas foram informados em decimal",
        "Confusão entre leitura em unidade de bit e em unidade de word",
        "Ordem das words ou sinal dos valores de 32 bits",
      ],
      checks: [
        "Compare com a tabela de notação do guia de números de dispositivo",
        "Compare sinal e hex no conversor de inteiros",
      ],
    },
    "pu-know": { q: "Você sabe qual dispositivo está caindo?", hint: "Se você só ouve o som de conexão/desconexão se repetir, escolha «Não»" },
    "pu-port": { q: "Ainda cai em outra porta USB (painel traseiro, sem hub)?" },
    "pu-cable": { q: "Ainda cai com outro cabo?" },
    "pu-suspend": { q: "Desligar a economia de energia do USB (suspensão seletiva, «permitir desligar») diminui as quedas?", hint: "O PortDock só lê essas configurações — mude-as você mesmo nas configurações do Windows" },
    "r-pu-find": {
      title: "Primeiro descubra qual dispositivo cai",
      causes: [
        "Ainda desconhecido — pode ser mouse, teclado, receptor sem fio, câmera, adaptador USB-serial ou hub",
      ],
      checks: [
        "Use o registro de conexões/desconexões USB do Hardware Tester (a partir da 0.10.0) para ver horários, nome do dispositivo e VID:PID",
        "Um dispositivo que cai 3 ou mais vezes em 10 minutos é marcado como «suspeita de quedas repetidas» — então siga este ramo de novo para ele",
      ],
    },
    "r-pu-port": {
      title: "A porta ou o hub original",
      causes: [
        "Fiação interna ou contato da porta frontal",
        "Hub alimentado pelo barramento com alimentação insuficiente",
      ],
      checks: [
        "Use uma porta traseira ou um hub com fonte própria",
        "Confirme no registro de conexões/desconexões USB do Hardware Tester que as quedas pararam depois de trocar de porta (a partir da 0.10.0)",
      ],
    },
    "r-pu-cable": {
      title: "Cabo ou conector",
      causes: [
        "Rompimento interno no cabo (cai ao mexer), conector frouxo",
        "Cabo USB ou extensão longos demais",
      ],
      checks: [
        "Use um cabo curto e de boa qualidade",
      ],
    },
    "r-pu-suspend": {
      title: "A economia de energia do USB desliga o dispositivo",
      causes: [
        "Suspensão seletiva de USB, «permitir que o computador desligue» no dispositivo ou no hub",
      ],
      checks: [
        "Leia a suspensão seletiva de USB com «Ler as configurações deste PC» do Port Inspector",
        "Num PC de máquina, revise também a suspensão do plano de energia",
      ],
    },
    "r-pu-device": {
      title: "Dispositivo, driver ou ambiente",
      causes: [
        "O próprio dispositivo ou o driver dele",
        "Um dispositivo USB 3 funcionando em velocidade USB 2.0 (sinal de problema de cabo ou porta)",
        "Em receptores sem fio, interferência de 2,4 GHz perto de portas USB 3.0",
        "Diferença de terra ou ruído dos equipamentos (ambientes industriais)",
      ],
      checks: [
        "Veja se cai em outro PC",
        "Procure as marcas «Vale conferir» de velocidade USB no Hardware Tester (a partir da 0.10.0)",
        "Meça a tensão entre o terra do PC e o dos equipamentos",
      ],
    },
  },
} satisfies TreeText;
