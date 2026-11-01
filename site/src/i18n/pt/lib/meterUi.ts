// lib/meterFig.ts · views/MultimeterCheckPage.astro — figuras de medição, explicações e campos (desenhados só no servidor)
export default {
  "RS-485 device terminals":
    "Bornes RS-485 do equipamento",
  "All devices powered off · wiring left in place":
    "Todos os equipamentos desligados · fiação no lugar",
  "Power on · polling stopped":
    "Ligado · polling parado",
  "Power on · ① A–SG, ② B–SG":
    "Ligado · ① A–SG, ② B–SG",
  "Terminals at the far device":
    "Bornes no equipamento mais distante",
  "Load switched on · at the device end":
    "Carga acionada · na ponta do equipamento",
  "Sensor wires (3-wire)":
    "Fios do sensor (3 fios)",
  "Brown +V":
    "Marrom +V",
  "Black out":
    "Preto saída",
  "Blue 0V":
    "Azul 0V",
  "Connected to the PLC input · ON and OFF":
    "Ligado à entrada do CLP · ON e OFF",
  "PC-side DB9 (DTE)":
    "DB9 do lado do PC (DTE)",
  "Not transmitting · device may be unplugged":
    "Sem transmitir · o equipamento pode estar desconectado",
  "USB shell":
    "Carcaça USB",
  // 기준 main 5d1837b 부터 그림의 SG/PE 묶음 이름은 «Equipment». «Device» 는 이 브랜치 기준판(ja) 모양을 맞추려고 남긴 줄 — 1차 MC 사전과 같은 번역(합친 뒤 지워도 됨)
  "Device":
    "Dispositivo",
  "Equipment":
    "Equipamento",
  "Both powered · DC and AC":
    "Ambos ligados · CC e CA",
  "Break the loop at one point, meter in series (mA jack)":
    "Abra o loop em um ponto, multímetro em série (borne mA)",
  "Supply":
    "Fonte",
  "Trans-":
    "Trans-",
  "mitter":
    "missor",
  "PLC input 250Ω":
    "Entrada CLP 250Ω",
  "Power off every device, leave the wiring as it is, and measure resistance (Ω) across A–B at any device. Enter the device count and bias resistors to compare with expected values.":
    "Desligue todos os equipamentos, deixe a fiação como está e meça a resistência (Ω) entre A e B em qualquer equipamento. Informe o número de equipamentos e os resistores de polarização para comparar com os valores esperados.",
  "Two 120 Ω terminations in parallel make 60 Ω. A receiver is typically 12 kΩ (one unit load); bias resistors can appear in series through a powered-off supply. Modbus spec: termination at both ends only (150 Ω, or 1 nF + 120 Ω in series). RC termination (1 nF in series) blocks DC, so a multimeter cannot see it.":
    "Duas terminações de 120 Ω em paralelo dão 60 Ω. Um receptor costuma ter 12 kΩ (uma carga unitária); os resistores de polarização podem aparecer em série através de uma fonte desligada. Especificação Modbus: terminação só nas duas pontas (150 Ω, ou 1 nF + 120 Ω em série). A terminação RC (1 nF em série) bloqueia CC, então o multímetro não a enxerga.",
  "Reading (Ω, OL allowed)":
    "Leitura (Ω, OL permitido)",
  "Transceivers (incl. adapter)":
    "Transceptores (incl. o conversor)",
  "Terminator":
    "Terminação",
  "Bias resistor (each)":
    "Resistor de polarização (cada)",
  "None / unknown":
    "Nenhum / desconhecido",
  "With power on and polling stopped (nobody transmitting), put red on B (D1·+) and black on A (D0·−) and measure DC volts.":
    "Com tudo ligado e o polling parado (ninguém transmitindo), coloque a ponta vermelha em B (D1·+) e a preta em A (D0·−) e meça tensão CC.",
  "TIA/EIA-485: receivers have a defined state beyond ±200 mV differential. Positive while idle means «1» (mark).":
    "TIA/EIA-485: os receptores têm estado definido além de ±200 mV diferenciais. Positivo em repouso significa «1» (marca).",
  "Unit":
    "Unidade",
  "Power on, then measure DC volts ① from A to SG (common · 0 V) and ② from B to SG. Entering only one is fine.":
    "Com tudo ligado, meça tensão CC ① de A até SG (comum · 0 V) e ② de B até SG. Basta informar uma delas.",
  "TIA/EIA-485: receiver common-mode range −7 to +12 V; usually between 0 and 5 V.":
    "TIA/EIA-485: faixa de modo comum do receptor de −7 a +12 V; normalmente entre 0 e 5 V.",
  "Break the loop at one point and insert the meter in series on its mA jack — or divide the voltage across the receiver resistor (e.g. 250 Ω) by its value.":
    "Abra o loop em um ponto e coloque o multímetro em série no borne de mA — ou divida a tensão sobre o resistor de carga (ex.: 250 Ω) pelo valor dele.",
  "NAMUR NE 43: measurement 3.8–20.5 mA, failure signal ≤ 3.6 mA or ≥ 21 mA. 4 mA = 0 %, 20 mA = 100 %.":
    "NAMUR NE 43: medição 3,8–20,5 mA, sinal de falha ≤ 3,6 mA ou ≥ 21 mA. 4 mA = 0 %, 20 mA = 100 %.",
  "Current (mA)":
    "Corrente (mA)",
  "With loads such as valves and relays switched on, measure +24V–0V at the far device, not at the supply.":
    "Com cargas como válvulas e relés acionadas, meça +24V–0V no equipamento mais distante, não na fonte.",
  "IEC 61131-2: 24 V DC supplies are generally allowed −15 % to +20 % (20.4–28.8 V). A drop of 5 % or less leaves margin.":
    "IEC 61131-2: fontes de 24 Vcc em geral admitem de −15 % a +20 % (20,4–28,8 V). Uma queda de 5 % ou menos deixa margem.",
  "Nominal (V)":
    "Nominal (V)",
  "Measured (V)":
    "Medida (V)",
  "With the sensor connected to the PLC input, measure DC volts between the output (usually black) and 0 V (blue), once with the sensor ON and once OFF.":
    "Com o sensor ligado à entrada do CLP, meça tensão CC entre a saída (normalmente preto) e o 0 V (azul), uma vez com o sensor em ON e outra em OFF.",
  "IEC 61131-2 24 V DC inputs: ON ≥ 15 V (type 1) or ≥ 11 V (types 2/3), OFF ≤ 5 V. For NPN, input voltage = supply − output.":
    "Entradas de 24 Vcc da IEC 61131-2: ON ≥ 15 V (tipo 1) ou ≥ 11 V (tipos 2/3), OFF ≤ 5 V. No NPN, tensão de entrada = alimentação − saída.",
  "Sensor type":
    "Tipo de sensor",
  "Sensor state (LED)":
    "Estado do sensor (LED)",
  "ON":
    "ON",
  "OFF":
    "OFF",
  "Output–0V (V)":
    "Saída–0V (V)",
  "Sensor supply (V)":
    "Alimentação do sensor (V)",
  "While nothing is sent, measure DC volts between pin 3 (TXD) and pin 5 (GND) of the PC-side DB9. Some adapters only drive TX once the port is open.":
    "Enquanto nada é enviado, meça tensão CC entre o pino 3 (TXD) e o pino 5 (GND) do DB9 do lado do PC. Alguns adaptadores só acionam o TX com a porta aberta.",
  "TIA-232: idle (mark) output −5 to −15 V, receiver threshold ±3 V, max ±25 V. +3.3/+5 V indicates a TTL UART.":
    "TIA-232: saída em repouso (marca) de −5 a −15 V, limiar do receptor ±3 V, máximo ±25 V. +3,3/+5 V indica uma UART TTL.",
  "Measure between the PC's USB shell (or PC ground) and the device SG/PE, in both DC (V⎓) and AC (V~). Enter the larger.":
    "Meça entre a carcaça USB do PC (ou o terra do PC) e o SG/PE do equipamento, em CC (V⎓) e em CA (V~). Informe o maior.",
  "Rule of thumb: under 1 V is comfortable; a few volts shrinks the RS-485 common-mode margin and drives current through non-isolated USB and RS-232.":
    "Regra prática: abaixo de 1 V está tranquilo; alguns volts reduzem a margem de modo comum do RS-485 e fazem corrente circular pelo USB não isolado e pelo RS-232.",
  "Difference (V)":
    "Diferença (V)",
  "Programmable controllers: equipment requirements (24 V DC supply, digital input types)":
    "Controladores programáveis: requisitos dos equipamentos (alimentação de 24 Vcc, tipos de entradas digitais)",
  "Interface for serial binary data interchange (signal levels)":
    "Interface para troca serial de dados binários (níveis de sinal)",
};
