// lib/wiring.ts — textos do diagrama de ligação, checklist e avisos (frase em inglês → português do Brasil). Usados pelo script da página
// Termos: resistor de terminação, polarização (fail-safe), endereço do escravo, ligação em cadeia (daisy chain), derivação, cabo null modem, diodo de roda livre
export default {
  "{} m — the Modbus spec allows at most 1000 m at 9600 bps with AWG26 or thicker (shorter than the general TIA-485 1200 m). Use thicker cable or split with a repeater.":
    "{0} m — a especificação Modbus permite no máximo 1000 m a 9600 bps com cabo AWG26 ou mais grosso (menos que os 1200 m gerais da TIA-485). Use um cabo mais grosso ou divida a linha com um repetidor.",
  "Device 1":
    "Equipamento 1",
  "Device {}":
    "Equipamento {0}",
  "Inverter {}":
    "Inversor {0}",
  "Master":
    "Mestre",
  "Slave ID {}":
    "Endereço {0}",
  "Bias on (one place)":
    "Polarização ligada (em um só ponto)",
  "Bias":
    "Polarização",
  "Daisy chain — total length about {} m · {} bps 8{}1":
    "Ligação em cadeia — comprimento total de cerca de {0} m · {1} bps 8{2}1",
  "D1 (B, +) — one wire of the twisted pair":
    "D1 (B, +) — um fio do par trançado",
  "D0 (A, −) — the other wire of the pair":
    "D0 (A, −) — o outro fio do par",
  "Common (SG, signal ground)":
    "Comum (SG, terra de sinal)",
  "Bias pull-up (+5 V)":
    "Pull-up de polarização (+5 V)",
  "{} m — one RS-485 segment is generally limited to about 1200 m. Split it with a repeater.":
    "{0} m — um segmento RS-485 costuma ficar limitado a cerca de 1200 m. Divida-o com um repetidor.",
  "At {} bps the rough limit is about {} m (rule of thumb bps × m ≤ 10⁸). Lower the baud rate or shorten the line.":
    "A {0} bps o limite aproximado é de cerca de {1} m (regra prática bps × m ≤ 10⁸). Reduza o baud rate ou encurte a linha.",
  "Slave ID {} is used twice — every ID on one bus must be different.":
    "O endereço do escravo {0} está repetido — todos os endereços de um barramento precisam ser diferentes.",
  "«{}» ID {} — Modbus slave IDs are 1–247.":
    "«{0}» endereço {1} — os endereços de escravo Modbus vão de 1 a 247.",
  "«{}» supports only {} bps per the device map.":
    "Pelo mapa de equipamentos, «{0}» só aceita {1} bps.",
  "«{}» defaults to parity {} — the whole bus needs one setting (check whether the device can change it).":
    "A paridade padrão de «{0}» é {1} — todo o barramento precisa da mesma configuração (veja se o equipamento permite mudá-la).",
  "«{}» accepts IDs {}–{}.":
    "«{0}» aceita endereços de {1} a {2}.",
  "The adapter ({}/{}) and devices ({}/{}) use different names — connect the same signal (D1 to D1, D0 to D0), not the same letter.":
    "O conversor ({0}/{1}) e os equipamentos ({2}/{3}) usam nomes diferentes — ligue o mesmo sinal (D1 com D1, D0 com D0), não a mesma letra.",
  "Only {} devices are drawn.":
    "Só {0} equipamentos são desenhados.",
  "Terminate only at the two ends of the line (here the adapter and «{}»). With biasing the Modbus spec recommends 150 Ω (0.5 W) or 1 nF + 120 Ω in series (0.25 W, RC termination — it draws less bias current at idle); a plain 120 Ω is also common practice. If a device has a termination switch, use it instead of adding an external resistor.":
    "Termine só nas duas pontas da linha (aqui o conversor e «{0}»). Com polarização, a especificação Modbus recomenda 150 Ω (0,5 W) ou 1 nF + 120 Ω em série (0,25 W, terminação RC — consome menos corrente de polarização em repouso); um resistor simples de 120 Ω também é prática comum. Se um equipamento tiver chave de terminação, use-a em vez de acrescentar um resistor externo.",
  "120 Ω termination only at the two ends of the line (here the adapter and «{}»). If a device has a termination switch, use it instead of adding an external resistor.":
    "Terminação de 120 Ω só nas duas pontas da linha (aqui o conversor e «{0}»). Se um equipamento tiver chave de terminação, use-a em vez de acrescentar um resistor externo.",
  "Bias (failsafe) at one place for the whole bus — usually the master (adapter) side switch or jumper. With biasing the Modbus spec lowers the maximum number of devices by 4 (32 → 28).":
    "Polarização (fail-safe) em um só ponto de todo o barramento — normalmente a chave ou jumper do lado do mestre (conversor). Com polarização, a especificação Modbus reduz em 4 o número máximo de equipamentos (32 → 28).",
  "Chain the devices one after another (daisy chain). Do not wire a star from one point; keep stubs under 20 m.":
    "Ligue os equipamentos um após o outro (em cadeia). Não faça uma estrela a partir de um ponto; mantenha as derivações abaixo de 20 m.",
  "Run Common (SG) as a third wire — ground potential differences between devices can break communication or damage devices.":
    "Leve o comum (SG) como terceiro fio — diferenças de potencial de terra entre equipamentos podem derrubar a comunicação ou danificar os equipamentos.",
  "A/B naming is reversed by some vendors — if nothing answers, swap the two wires (reversed polarity does not damage devices).":
    "Alguns fabricantes invertem os nomes A/B — se ninguém responder, troque os dois fios (a polaridade invertida não danifica os equipamentos).",
  "Terminal names here are generic. Check the terminal numbers in each device manual.":
    "Os nomes de borne aqui são genéricos. Confira os números de borne no manual de cada equipamento.",
  "Baud, data bits, parity and stop bits must match on every device; slave IDs (1–247) must be unique.":
    "Baud rate, bits de dados, paridade e stop bits precisam ser iguais em todos os equipamentos; os endereços de escravo (1–247) não podem se repetir.",
  "Generally up to 32 unit loads per segment without a repeater with standard transceivers.":
    "Com transceptores padrão, em geral até 32 cargas unitárias por segmento sem repetidor.",
  "Upper pair: master → devices · lower pair: devices → master — about {} m · {} bps":
    "Par superior: mestre → equipamentos · par inferior: equipamentos → mestre — cerca de {0} m · {1} bps",
  "{} → {} (master transmit +)":
    "{0} → {1} (transmissão + do mestre)",
  "{} → {} (master transmit −)":
    "{0} → {1} (transmissão − do mestre)",
  "device {} → master {}":
    "equipamento {0} → mestre {1}",
  "{} m — one segment is generally limited to about 1200 m.":
    "{0} m — um segmento costuma ficar limitado a cerca de 1200 m.",
  "At {} bps the rough limit is about {} m.":
    "A {0} bps o limite aproximado é de cerca de {1} m.",
  "Slave ID {} is used twice.":
    "O endereço do escravo {0} está repetido.",
  "«{}»: {} differs from the device map.":
    "«{0}»: {1} diferente do mapa de equipamentos.",
  "baud rate":
    "baud rate",
  "parity":
    "paridade",
  "ID range":
    "faixa de endereços",
  "Cross the pairs — master TX± to device RX±, device TX± to master RX±.":
    "Cruze os pares — TX± do mestre no RX± dos equipamentos, TX± dos equipamentos no RX± do mestre.",
  "Keep + and − of each signal on the same twisted pair; use two separate pairs.":
    "Mantenha o + e o − de cada sinal no mesmo par trançado; use dois pares separados.",
  "In 4-wire Modbus each pair is terminated at both ends of the bus (as drawn). A point-to-point RS-422 link with a single driver is sometimes terminated only at the far (receiving) end of that pair — follow the device manual.":
    "No Modbus a 4 fios cada par é terminado nas duas pontas do barramento (como no desenho). Um enlace RS-422 ponto a ponto com um só transmissor às vezes é terminado só na ponta distante (receptora) desse par — siga o manual do equipamento.",
  "Bias the pair several devices drive (lower pair) at one place on the master side.":
    "Polarize o par acionado por vários equipamentos (par inferior) em um só ponto do lado do mestre.",
  "Set the adapter to 4-wire (full duplex) mode — many have a 2-wire/4-wire switch or jumper.":
    "Coloque o conversor no modo 4 fios (full duplex) — muitos têm chave ou jumper de 2/4 fios.",
  "+/− naming and whether TX/RX are named from the device's own side vary by vendor — check the manual's terminal numbers.":
    "Os nomes +/− e se TX/RX são nomeados do ponto de vista do próprio equipamento variam conforme o fabricante — confira os números de borne no manual.",
  "Connect Common (SG) as well.":
    "Ligue também o comum (SG).",
  "Device (DCE)":
    "Equipamento (DCE)",
  "Device (DTE)":
    "Equipamento (DTE)",
  "male connector":
    "conector macho",
  "check the manual's pin table":
    "confira a tabela de pinos do manual",
  "Straight (DTE ↔ DCE)":
    "Direto (DTE ↔ DCE)",
  "Null modem, 3 wires (no handshake)":
    "Null modem de 3 fios (sem handshake)",
  "Null modem (with RTS/CTS, DTR/DSR)":
    "Null modem (com RTS/CTS, DTR/DSR)",
  "Data TxD → RxD":
    "Dados TxD → RxD",
  "Signal ground 5":
    "Terra de sinal 5",
  "Flow control RTS/CTS":
    "Controle de fluxo RTS/CTS",
  "Modem control DTR/DSR/DCD":
    "Controle de modem DTR/DSR/DCD",
  "Data":
    "Dados",
  "Signal ground":
    "Terra de sinal",
  "Hardware flow control":
    "Controle de fluxo por hardware",
  "Modem control":
    "Controle de modem",
  "Wiring table":
    "Tabela de ligação",
  "PC pin":
    "Pino do PC",
  "Device pin":
    "Pino do equipamento",
  "DB9 pinout (DTE side, TIA-574)":
    "Pinagem DB9 (lado DTE, TIA-574)",
  "Signal":
    "Sinal",
  "At the PC (DTE)":
    "No PC (DTE)",
  "Output":
    "Saída",
  "Input":
    "Entrada",
  "In the device manual's pin table, see whether pin 2 transmits or receives. If pin 3 transmits it is a DTE like the PC (use a null modem); if pin 2 transmits, use a straight cable.":
    "Na tabela de pinos do manual do equipamento, veja se o pino 2 transmite ou recebe. Se ele transmite pelo pino 3, é um DTE como o PC (use um cabo null modem); se transmite pelo pino 2, use um cabo direto.",
  "Always connect pin 5 (GND) — without it bytes are garbled or nothing arrives.":
    "Ligue sempre o pino 5 (GND) — sem ele os bytes chegam corrompidos ou nada chega.",
  "Without flow control (\"None\" in the terminal program) three wires — TxD, RxD, GND — are enough.":
    "Sem controle de fluxo («Nenhum» no programa de terminal) bastam três fios — TxD, RxD e GND.",
  "With hardware flow control (RTS/CTS), cross pins 7 and 8 too. Enabled without a CTS wire, transmission stalls.":
    "Com controle de fluxo por hardware (RTS/CTS), cruze também os pinos 7 e 8. Se estiver ativado e faltar o fio CTS, a transmissão trava.",
  "Loopback test: tie pins 2 and 3 at the PC connector; if bytes come back, the port and adapter work.":
    "Teste de loopback: una os pinos 2 e 3 no conector do PC; se os bytes voltarem, a porta e o adaptador funcionam.",
  "Commercial cables are not all wired alike — check the cable diagram and the device manual's pin numbers.":
    "Nem todos os cabos comerciais são ligados da mesma forma — confira o esquema do cabo e os números de pino do manual do equipamento.",
  "24 V DC supply":
    "Fonte de 24 Vcc",
  "2-wire (loop powered)":
    "2 fios (alimentado pelo loop)",
  "3-wire":
    "3 fios",
  "4-wire (separately powered)":
    "4 fios (alimentação separada)",
  "Transmitter":
    "Transmissor",
  "PLC analog input":
    "Entrada analógica do CLP",
  "current input channel":
    "canal de entrada de corrente",
  "Power: per transmitter manual (separate)":
    "Alimentação: conforme o manual do transmissor (separada)",
  "(not needed for 4-wire)":
    "(não é necessária a 4 fios)",
  "+ supply":
    "+ alimentação",
  "Loop current (signal)":
    "Corrente do loop (sinal)",
  "Voltage left for the transmitter at 20 mA ≈ {} − 0.02 × {} = {} V (cable excluded). It must exceed the minimum supply in the transmitter datasheet.":
    "Tensão que sobra para o transmissor a 20 mA ≈ {0} − 0,02 × {1} = {2} V (sem contar o cabo). Precisa ser maior que a alimentação mínima da folha de dados do transmissor.",
  "The receiver resistor must be above 0.":
    "O resistor de carga precisa ser maior que 0.",
  "With {} Ω, 4–20 mA is {}–{} V (V = I × R). 250 Ω gives 1–5 V.":
    "Com {0} Ω, 4–20 mA dão {1}–{2} V (V = I × R). Com 250 Ω obtém-se 1–5 V.",
  "Check that the PLC channel is set to current, and whether it is an active input (supplies loop power) or passive. A 2-wire transmitter on a passive input needs an external 24 V supply.":
    "Confira se o canal do CLP está configurado como corrente e se é uma entrada ativa (alimenta o loop) ou passiva. Um transmissor a 2 fios em entrada passiva precisa de uma fonte externa de 24 V.",
  "2-wire shares one pair for power and signal; 3-wire shares 0 V between power and signal; 4-wire keeps them separate.":
    "A 2 fios, alimentação e sinal compartilham um par; a 3 fios compartilham o 0 V; a 4 fios ficam separados.",
  "Reversed polarity stops the current, reading as 0 mA (like an open wire).":
    "Com a polaridade invertida a corrente não circula e lê-se 0 mA (como um fio rompido).",
  "Ground the cable shield at one end only (usually the panel side) — follow site rules and the manual.":
    "Aterre a blindagem do cabo em uma só ponta (normalmente o lado do painel) — siga as regras da instalação e o manual.",
  "Terminal names (AI+, I+, V+, COM) and numbers vary — check the PLC and transmitter manuals.":
    "Os nomes (AI+, I+, V+, COM) e números de borne variam — confira os manuais do CLP e do transmissor.",
  "Voltage across {} Ω":
    "Tensão sobre {0} Ω",
  "PLC digital input":
    "Entrada digital do CLP",
  "Sensor {}":
    "Sensor {0}",
  "BK out":
    "Saída BK",
  "NPN: when on, the black wire is pulled to 0 V; current flows COM (+24 V) → input → sensor":
    "NPN: quando ativo, o fio preto vai a 0 V; a corrente vai de COM (+24 V) → entrada → sensor",
  "PNP: when on, the black wire outputs +24 V; current flows sensor → input → COM (0 V)":
    "PNP: quando ativo, o fio preto fornece +24 V; a corrente vai do sensor → entrada → COM (0 V)",
  "Brown — +24 V":
    "Marrom — +24 V",
  "Blue — 0 V":
    "Azul — 0 V",
  "Black — output → input":
    "Preto — saída → entrada",
  "NPN sensors: input COM to +24 V. PNP sensors: COM to 0 V. Keep one sensor type per COM group.":
    "Sensores NPN: COM das entradas em +24 V. Sensores PNP: COM em 0 V. Um só tipo de sensor por grupo de COM.",
  "«Sink/source input» names are used in opposite ways by different vendors — some call the NPN-compatible input «sink», others call the PNP-compatible input «sinking». Go by where COM connects, not the name.":
    "Os fabricantes usam os nomes «entrada sink/source» em sentidos opostos — uns chamam de «sink» a entrada para NPN, outros chamam de «sinking» a entrada para PNP. Guie-se por onde o COM é ligado, não pelo nome.",
  "Wire colours follow the IEC 60947-5-2 convention (brown +, blue 0 V, black output, white second output on 4-wire) — check the sensor datasheet.":
    "As cores seguem a convenção IEC 60947-5-2 (marrom +, azul 0 V, preto saída, branco segunda saída nos de 4 fios) — confira a folha de dados do sensor.",
  "2-wire proximity sensors are wired differently (in series with the load, leakage current) — do not wire them like 3-wire sensors.":
    "Sensores de proximidade a 2 fios são ligados de outro jeito (em série com a carga, corrente de fuga) — não os ligue como os de 3 fios.",
  "The sensor supply and PLC input supply must share 0 V (tie the 0 V lines if there are two supplies).":
    "A fonte dos sensores e a das entradas do CLP precisam compartilhar o 0 V (una as linhas de 0 V se houver duas fontes).",
  "Input names (X0, I0.0, %IX0 …) and COM groups vary — check the PLC manual's terminal numbers.":
    "Os nomes de entrada (X0, I0.0, %IX0 …) e os grupos de COM variam — confira os números de borne no manual do CLP.",
  "AC supply L":
    "Alimentação CA L",
  "Relay output":
    "Saída a relé",
  "Transistor NPN (sinking)":
    "Transistor NPN (sink)",
  "Transistor PNP (sourcing)":
    "Transistor PNP (source)",
  "PLC output":
    "Saída do CLP",
  "Load":
    "Carga",
  "AC coil":
    "Bobina CA",
  "DC coil":
    "Bobina CC",
  "solenoid / relay":
    "solenoide / relé",
  "Diode (band to +)":
    "Diodo (faixa para o +)",
  "RC snubber":
    "Snubber RC",
  "Output → load":
    "Saída → carga",
  "Flyback diode":
    "Diodo de roda livre",
  "Transistor outputs drive DC loads only — use relay or SSR (triac) outputs for AC loads. Drawn as DC.":
    "Saídas a transistor só acionam cargas CC — para cargas CA use saídas a relé ou SSR (triac). Desenhado como CC.",
  "On DC coils, fit a flyback diode across the coil with the cathode (band) to the + side. Reversed, it shorts the output when switched on.":
    "Em bobinas CC, coloque um diodo de roda livre em paralelo com a bobina, com o catodo (faixa) para o lado +. Invertido, ele curto-circuita a saída ao acionar.",
  "A diode absorbs the turn-off spike but slows coil release — use diode + Zener etc. when fast release matters.":
    "O diodo absorve o pico no desligamento, mas atrasa a liberação da bobina — use diodo + Zener ou similar quando a liberação rápida importar.",
  "For AC loads use an RC snubber or varistor across the coil, not a diode.":
    "Para cargas CA use um snubber RC ou um varistor em paralelo com a bobina, não um diodo.",
  "With NPN (sinking) transistor outputs the load goes between + and the output; with PNP (sourcing), between the output and 0 V. COM connects differently.":
    "Com saídas a transistor NPN (sink) a carga fica entre o + e a saída; com PNP (source), entre a saída e o 0 V. O COM é ligado de forma diferente.",
  "Check the PLC manual for maximum current per point and per COM group, and relay contact ratings (voltage, current, life).":
    "Confira no manual do CLP a corrente máxima por ponto e por grupo de COM, e os valores nominais dos contatos do relé (tensão, corrente, vida útil).",
  "Output names (Y0, Q0.0, %QX0 …) vary — check the PLC manual's terminal numbers.":
    "Os nomes de saída (Y0, Q0.0, %QX0 …) variam — confira os números de borne no manual do CLP.",
  "RS-485 2-wire multidrop":
    "RS-485 a 2 fios multiponto",
  "RS-485 4-wire / RS-422":
    "RS-485 a 4 fios / RS-422",
  "4-20 mA transmitter → PLC analog input":
    "Transmissor 4-20 mA → entrada analógica do CLP",
  "NPN/PNP 3-wire sensor → PLC input":
    "Sensor NPN/PNP de 3 fios → entrada do CLP",
  "Relay / transistor output → load":
    "Saída a relé / transistor → carga",
};
