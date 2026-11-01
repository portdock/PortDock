// lib/cableSelect.ts — guia de seleção de cabos (frase em inglês → português do Brasil)
// Termos: bitola (seção), capacidade de condução de corrente (IZ), queda de tensão, par trançado blindado, cabo de extensão/compensação, esteira porta-cabos, raio mínimo de curvatura
export default {
  "Over 1200 m — split the line with a repeater.":
    "Mais de 1200 m — divida a linha com um repetidor.",
  "Beyond the rough limit for this baud rate ({} m) — lower the baud rate or split the line.":
    "Além do limite aproximado para este baud rate ({0} m) — reduza o baud rate ou divida a linha.",
  "Within the rough limit of {} m.":
    "Dentro do limite aproximado de {0} m.",
  "Beyond the Modbus spec's 1000 m at 9600 bps (AWG 26 or thicker) — use thicker cable or a lower rate.":
    "Além dos 1000 m a 9600 bps da especificação Modbus (AWG 26 ou mais grosso) — use cabo mais grosso ou taxa menor.",
  "Line capacitance about {} pF — over 2500 pF. Use low-capacitance cable, a lower baud rate, or RS-485/422.":
    "Capacitância da linha de cerca de {0} pF — acima de 2500 pF. Use cabo de baixa capacitância, baud rate menor ou RS-485/422.",
  "About {} pF, within the limit, but over 15 m — allowing for device capacitance and noise, test at a lower baud rate.":
    "Cerca de {0} pF, dentro do limite, mas acima de 15 m — considerando a capacitância dos equipamentos e o ruído, teste com baud rate menor.",
  "Line capacitance about {} pF — within 2500 pF.":
    "Capacitância da linha de cerca de {0} pF — dentro de 2500 pF.",
  "Over the 100 m copper channel — add a switch or use fibre.":
    "Acima do canal de cobre de 100 m — acrescente um switch ou use fibra.",
  "Over 90 m of fixed cabling — check the channel including patch cords stays within 100 m.":
    "Mais de 90 m de cabeamento fixo — confira se o canal, incluindo os patch cords, fica dentro de 100 m.",
  "Within the 100 m channel.":
    "Dentro do canal de 100 m.",
  "AC power (single- or three-phase)":
    "Alimentação CA (monofásica ou trifásica)",
  "Single-phase: L, N, PE (3 cores). Three-phase: L1, L2, L3 (and N) plus PE in the same cable.":
    "Monofásica: L, N, PE (3 condutores). Trifásica: L1, L2, L3 (e N) mais PE no mesmo cabo.",
  "The size must satisfy both: (1) current-carrying capacity (installation method, ambient temperature, grouping) and (2) voltage drop. This tool calculates (2) only.":
    "A bitola precisa atender às duas coisas: (1) capacidade de condução de corrente (método de instalação, temperatura ambiente, agrupamento) e (2) queda de tensão. Esta ferramenta só calcula a (2).",
  "For drive (VFD) outputs, follow the maker's recommended shielded motor cable and grounding.":
    "Nas saídas de inversores (VFD), siga o cabo de motor blindado e o aterramento recomendados pelo fabricante.",
  "Take IZ from Annex B of IEC 60364-5-52 (KEC 232.5.2 in Korea) and coordinate with protection so that IB ≤ In ≤ IZ.":
    "Tome IZ do anexo B da IEC 60364-5-52 (KEC 232.5.2 na Coreia) e coordene com a proteção para que IB ≤ In ≤ IZ.",
  "Maximum conductor temperature: PVC 70 °C, XLPE/EPR 90 °C — the same size carries different current.":
    "Temperatura máxima do condutor: PVC 70 °C, XLPE/EPR 90 °C — a mesma bitola conduz correntes diferentes.",
  "Keep apart from communication and analog cables; cross at right angles.":
    "Mantenha afastado dos cabos de comunicação e analógicos; cruze em ângulo reto.",
  "KEC 212.4.1, 232.5 / IEC 60364-5-52 Annex B (ampacity — values from the original)":
    "KEC 212.4.1, 232.5 / IEC 60364-5-52 anexo B (capacidade de condução — valores do original)",
  "Voltage drop: IEC 60028 copper resistivity 1/58 Ω·mm²/m":
    "Queda de tensão: resistividade do cobre da IEC 60028, 1/58 Ω·mm²/m",
  "24 V DC power and control":
    "Alimentação e comando em 24 Vcc",
  "Run +24 V and 0 V in the same size — the drop happens in both conductors.":
    "Leve +24 V e 0 V com a mesma bitola — a queda acontece nos dois condutores.",
  "For remote sensors, valves and devices, voltage drop usually decides the size. Compare the voltage at the load with the device's minimum input voltage.":
    "Para sensores, válvulas e equipamentos distantes, quem decide a bitola costuma ser a queda de tensão. Compare a tensão na carga com a tensão mínima de entrada do equipamento.",
  "Control signals (contacts, NPN/PNP): multi-core control cable, shielded where noise is high.":
    "Sinais de comando (contatos, NPN/PNP): cabo de controle multivias, blindado onde houver muito ruído.",
  "Loads with high inrush (solenoids, motor brakes) drop more at switch-on.":
    "Cargas com corrente de partida alta (solenoides, freios de motor) caem mais ao acionar.",
  "Raising the supply output to cover the drop only works within the devices' maximum input voltage.":
    "Aumentar a saída da fonte para compensar a queda só funciona dentro da tensão máxima de entrada dos equipamentos.",
  "Voltage drop: IEC 60028 resistivity, IEC 60228 nominal sizes":
    "Queda de tensão: resistividade da IEC 60028, bitolas nominais da IEC 60228",
  "RS-485 / RS-422 communication":
    "Comunicação RS-485 / RS-422",
  "Twisted pair with an overall shield. 2-wire RS-485: one pair (A, B) plus a signal ground (SG) wire; 4-wire and RS-422: two pairs plus SG.":
    "Par trançado com blindagem geral. RS-485 a 2 fios: um par (A, B) mais um fio de terra de sinal (SG); a 4 fios e RS-422: dois pares mais SG.",
  "Use a cable rated for RS-485 with a stated characteristic impedance (commonly 120 Ω) and match the end terminations to it.":
    "Use um cabo próprio para RS-485 com impedância característica declarada (normalmente 120 Ω) e ajuste a ela as terminações das pontas.",
  "Modbus serial spec: AWG 26 or thicker, up to 1000 m at 9600 bps, stubs 20 m or less.":
    "Especificação Modbus serial: AWG 26 ou mais grosso, até 1000 m a 9600 bps, derivações de 20 m ou menos.",
  "Daisy chain — avoid star wiring and long stubs.":
    "Ligação em cadeia — evite ligação em estrela e derivações longas.",
  "Distance and speed trade off: roughly bps × m ≤ 10⁸, at most about 1200 m.":
    "Distância e velocidade se compensam: aproximadamente bps × m ≤ 10⁸, no máximo cerca de 1200 m.",
  "Ground the shield (one end or both) as the device or bus installation guide says.":
    "Aterre a blindagem (em uma ponta ou nas duas) conforme o guia de instalação do equipamento ou do barramento.",
  "MODBUS over serial line V1.02 §3.4":
    "MODBUS over serial line V1.02 §3.4",
  "TI SLLA070D — 1200 m, bps × m ≤ 10⁸":
    "TI SLLA070D — 1200 m, bps × m ≤ 10⁸",
  "RS-232 communication":
    "Comunicação RS-232",
  "Keep it short — the spec limits line capacitance (under 2500 pF), not length. About 15 to 20 m with ordinary cable.":
    "Mantenha curto — a especificação limita a capacitância da linha (abaixo de 2500 pF), não o comprimento. Cerca de 15 a 20 m com cabo comum.",
  "At least TX, RX and SG (GND); more (RTS, CTS, …) with hardware flow control. Shielded multi-core cable.":
    "No mínimo TX, RX e SG (GND); mais (RTS, CTS …) com controle de fluxo por hardware. Cabo multivias blindado.",
  "If both ends are DTE, use a crossover (null-modem) cable.":
    "Se as duas pontas forem DTE, use um cabo cruzado (null modem).",
  "For longer runs: low-capacitance cable, lower baud rate, or an RS-485/422 converter.":
    "Para trechos mais longos: cabo de baixa capacitância, baud rate menor ou um conversor RS-485/422.",
  "From the datasheet pF/m: rough length = 2500 pF ÷ pF/m (an upper value; device input capacitance not subtracted).":
    "A partir do pF/m da folha de dados: comprimento aproximado = 2500 pF ÷ pF/m (valor máximo; a capacitância de entrada dos equipamentos não é descontada).",
  "TI SLLA067C §2.13 — TIA-232 2500 pF, about 20 m":
    "TI SLLA067C §2.13 — TIA-232 2500 pF, cerca de 20 m",
  "4–20 mA and 0–10 V analog":
    "Analógico 4–20 mA e 0–10 V",
  "Shielded twisted pair — each signal pair twisted, overall or individual shields.":
    "Par trançado blindado — cada par de sinal trançado, com blindagem geral ou individual.",
  "In a 4–20 mA loop the cable resistance eats supply voltage. For long runs, check the transmitter terminal voltage with a loop load calculation.":
    "Num loop de 4–20 mA a resistência do cabo consome tensão da fonte. Em trechos longos, confira a tensão nos bornes do transmissor com um cálculo de carga do loop.",
  "0–10 V voltage signals are more sensitive to resistance and noise; keep them short.":
    "Sinais de tensão de 0–10 V são mais sensíveis a resistência e ruído; mantenha-os curtos.",
  "The shield is usually grounded at one end (the receiving end) — follow the device guide if it says otherwise.":
    "A blindagem costuma ser aterrada em uma ponta (a do receptor) — siga o guia do equipamento se ele disser outra coisa.",
  "Do not share a duct with power or drive output cables.":
    "Não compartilhe a eletrocalha com cabos de potência ou saídas de inversores.",
  "General practice — the loop calculation is Ohm's law":
    "Prática geral — o cálculo do loop é a lei de Ohm",
  "Thermocouples and RTDs (Pt100)":
    "Termopares e RTDs (Pt100)",
  "Thermocouple: extension (X) or compensating (C) cable of the same type — e.g. KX or KCA/KCB for type K. Copper wire in between creates new junctions and error.":
    "Termopar: cabo de extensão (X) ou de compensação (C) do mesmo tipo — ex.: KX ou KCA/KCB para o tipo K. Fio de cobre no meio cria novas junções e erro.",
  "IEC 60584-3 colours: + core in the type colour (K green, J black, T brown, E violet, N pink, R/S orange), − core white. Older and other national codes differ.":
    "Cores da IEC 60584-3: condutor + na cor do tipo (K verde, J preto, T marrom, E violeta, N rosa, R/S laranja), condutor − branco. Códigos antigos e de outros países são diferentes.",
  "RTD (Pt100): for 3-wire use the same length and size on all three wires (so lead resistance cancels); 4-wire for precision. Shielded cable.":
    "RTD (Pt100): a 3 fios use o mesmo comprimento e bitola nos três (para a resistência dos fios se anular); a 4 fios para precisão. Cabo blindado.",
  "Reversed polarity reads down as it heats (including the compensating cable).":
    "Com a polaridade invertida a leitura cai ao aquecer (inclusive no cabo de compensação).",
  "Compensating cables have a limited temperature range — use extension cable and heat-resistant insulation in hot zones.":
    "Cabos de compensação têm faixa de temperatura limitada — em zonas quentes use cabo de extensão e isolação resistente ao calor.",
  "IEC 60584-3 extension and compensating cables, colours":
    "IEC 60584-3: cabos de extensão e compensação, cores",
  "Ethernet (Modbus TCP, cameras, …)":
    "Ethernet (Modbus TCP, câmeras …)",
  "100 Mbps and 1 Gbps: Cat5e or better; 10 Gbps: Cat6A (Cat6 only for short runs).":
    "100 Mbps e 1 Gbps: Cat5e ou superior; 10 Gbps: Cat6A (Cat6 só em trechos curtos).",
  "One copper channel is 100 m — 90 m fixed cabling plus 10 m of patch cords.":
    "Um canal de cobre tem 100 m — 90 m de cabeamento fixo mais 10 m de patch cords.",
  "Factory floor (noise, oil, movement): shielded (S/FTP, SF/UTP) industrial cable, M12 D-coded (100 Mbps) or X-coded (1/10 Gbps) connectors.":
    "No chão de fábrica (ruído, óleo, movimento): cabo industrial blindado (S/FTP, SF/UTP), conectores M12 codificação D (100 Mbps) ou X (1/10 Gbps).",
  "Beyond 100 m add a switch or go to fibre.":
    "Além de 100 m, acrescente um switch ou passe para fibra.",
  "Use one wiring scheme (T568A or B) for the whole site.":
    "Use um só padrão de ligação (T568A ou B) em toda a instalação.",
  "Industrial Ethernet fieldbuses (PROFINET, …) have their own cable guidelines.":
    "Redes de campo Ethernet industriais (PROFINET …) têm guias de cabeamento próprios.",
  "ANSI/TIA-568 channel 100 m (90 + 10)":
    "ANSI/TIA-568 canal de 100 m (90 + 10)",
  "IEEE 802.3 — 1000BASE-T (Cat5e), 10GBASE-T (Cat6A 100 m)":
    "IEEE 802.3 — 1000BASE-T (Cat5e), 10GBASE-T (Cat6A 100 m)",
  "Encoders and servo motors":
    "Encoders e servomotores",
  "Use the maker's dedicated servo power and encoder cables (or cables to the maker's spec) — shielding, pairing and maximum length are matched to the drive.":
    "Use os cabos de potência e de encoder próprios do fabricante do servo (ou cabos conforme a especificação dele) — blindagem, pares e comprimento máximo são ajustados ao drive.",
  "Incremental encoders (line driver A/A̅, B/B̅, Z/Z̅): individually twisted pairs plus shield. Open-collector outputs: keep short.":
    "Encoders incrementais (line driver A/A̅, B/B̅, Z/Z̅): pares trançados individualmente mais blindagem. Saídas em coletor aberto: mantenha curtas.",
  "Maximum length and encoder supply drop: from the drive manual.":
    "Comprimento máximo e queda na alimentação do encoder: conforme o manual do drive.",
  "Run power and encoder cables apart; terminate the shield as the manual shows.":
    "Leve os cabos de potência e de encoder separados; termine a blindagem como o manual mostra.",
  "General practice — lengths and specs from the drive and motor manuals":
    "Prática geral — comprimentos e especificações conforme os manuais do drive e do motor",
  "Moving parts (cable chains, robots)":
    "Partes móveis (esteiras porta-cabos, robôs)",
  "For continuous flexing use cables rated for cable chains (high-flex) — fine stranding, lay and jacket designed for bending.":
    "Para flexão contínua use cabos próprios para esteira porta-cabos (alta flexibilidade) — fios finos, encordoamento e capa projetados para dobrar.",
  "The minimum bending radius is given in the maker's catalogue as a multiple of the outer diameter — make sure the chain radius is at least that.":
    "O raio mínimo de curvatura aparece no catálogo do fabricante como múltiplo do diâmetro externo — garanta que o raio da esteira seja pelo menos esse.",
  "For torsion (robot axes) use cables with a torsion rating.":
    "Para torção (eixos de robô) use cabos com especificação para torção.",
  "Use separators and clearance so cables do not twist together; spread heavy cables evenly to the outside.":
    "Use separadores e folga para que os cabos não se enrosquem; distribua os cabos pesados de forma igual para o lado de fora.",
  "Flex life, acceleration and travel: from the maker's data.":
    "Vida útil à flexão, aceleração e curso: conforme os dados do fabricante.",
  "General practice — bending radius and life from cable and chain makers":
    "Prática geral — raio de curvatura e vida útil conforme os fabricantes de cabos e esteiras",
};
