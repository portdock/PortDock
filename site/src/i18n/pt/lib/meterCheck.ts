// lib/meterCheck.ts — avaliação das leituras do multímetro (frase em inglês → português do Brasil)
// Termos: resistor de terminação, polarização (fail-safe), modo comum, sinal de falha (NE 43), tensão residual, fuga
export default {
  "RS-485 A–B resistance (power off)":
    "Resistência A–B do RS-485 (desligado)",
  "RS-485 idle A–B voltage (bias)":
    "Tensão A–B do RS-485 em repouso (polarização)",
  "RS-485 A/B to SG voltage (common mode)":
    "Tensão A/B–SG do RS-485 (modo comum)",
  "4–20 mA loop current":
    "Corrente do loop 4–20 mA",
  "24 V supply — voltage at the device under load":
    "Fonte de 24 V — tensão no equipamento com carga",
  "NPN/PNP sensor output voltage":
    "Tensão de saída do sensor NPN/PNP",
  "RS-232 TX idle voltage":
    "Tensão TX do RS-232 em repouso",
  "Ground-to-ground voltage":
    "Tensão entre terras",
  "Enter a number.":
    "Informe um número.",
  "RC termination (1 nF + 120 Ω in series — the form the Modbus spec recommends with biasing) blocks DC with its capacitor, so a multimeter's resistance (DC) range cannot see it. Such a bus reads like «no termination» even when terminated — choose RC in the «Terminator» field, or look at the end devices' termination switches and parts.":
    "A terminação RC (1 nF + 120 Ω em série — a forma que a especificação Modbus recomenda com polarização) bloqueia CC com o capacitor, então a escala de resistência (CC) do multímetro não a enxerga. Esse barramento aparece como «sem terminação» mesmo terminado — escolha RC no campo «Terminação» ou confira as chaves e componentes de terminação dos equipamentos das pontas.",
  "Expected with both ends terminated (2)":
    "Esperado com as duas pontas terminadas (2)",
  "One end only (1)":
    "Só uma ponta (1)",
  "No termination":
    "Sem terminação",
  "Expected values assume {} transceivers at one unit load (12 kΩ) each and the bias resistors appearing in series through the powered-off supply. With many 1/8-unit-load devices the real value is a little higher.":
    "Os valores esperados supõem {0} transceptores de uma carga unitária (12 kΩ) cada e os resistores de polarização em série através da fonte desligada. Com muitos equipamentos de 1/8 de carga unitária o valor real fica um pouco maior.",
  "Close to 0 Ω — A and B are shorted together.":
    "Perto de 0 Ω — A e B estão em curto.",
  "Look for stray strands at terminals, crushed cable or a damaged transceiver. Re-measure while removing devices one by one to narrow it down.":
    "Procure fios soltos nos bornes, cabo esmagado ou transceptor danificado. Meça de novo tirando os equipamentos um a um para isolar o ponto.",
  "Close to the value for termination at both ends (≈ {} Ω).":
    "Perto do valor com terminação nas duas pontas (≈ {0} Ω).",
  "Termination belongs only at the two physical ends — this reading alone does not tell which devices have it.":
    "A terminação fica só nas duas pontas físicas — esta leitura sozinha não diz quais equipamentos a têm.",
  "Close to the value for termination at one end only (≈ {} Ω).":
    "Perto do valor com terminação em uma só ponta (≈ {0} Ω).",
  "The standard is both ends. Short, slow lines (≤ 9600 bps, tens of metres) often work like this, but long or fast lines can garble bytes from reflections. Check the termination switch or 120 Ω at the other end.":
    "O padrão é nas duas pontas. Linhas curtas e lentas (≤ 9600 bps, dezenas de metros) costumam funcionar assim, mas em linhas longas ou rápidas as reflexões podem corromper bytes. Confira a chave de terminação ou os 120 Ω da outra ponta.",
  "Close to the value with no termination (hundreds of Ω to several kΩ or more).":
    "Perto do valor sem terminação (de centenas de Ω a vários kΩ ou mais).",
  "The termination switches at both ends may be off or the 120 Ω missing. Some devices only switch in internal termination when powered, so it can read like this with power off.":
    "As chaves de terminação das duas pontas podem estar desligadas, ou faltam os 120 Ω. Alguns equipamentos só ligam a terminação interna quando energizados, então desligados podem dar esta leitura.",
  "OL between A and B can also mean the line is broken part-way — measure again at the end device's terminals.":
    "OL entre A e B também pode indicar a linha rompida no meio do caminho — meça de novo nos bornes do equipamento da ponta.",
  "Reads like three or more terminations (≈ {} Ω or less).":
    "Parece haver três ou mais terminações (≈ {0} Ω ou menos).",
  "A middle device may have its termination switch on, or adapter and device terminations overlap. Too many terminations shrink the signal and starve the bias, causing missing or garbled replies.":
    "Um equipamento do meio pode estar com a chave de terminação ligada, ou as terminações do conversor e do equipamento se sobrepõem. Terminações demais reduzem o sinal e deixam a polarização sem margem, com respostas faltando ou corrompidas.",
  "Very many devices (dozens) or small bias resistors also pull it down this far — make sure the device count and bias fields match the real bus.":
    "Muitos equipamentos (dezenas) ou resistores de polarização pequenos também baixam tanto o valor — confira se os campos de número de equipamentos e de polarização batem com o barramento real.",
  "Expected with RC termination only (DC)":
    "Esperado só com terminação RC (CC)",
  "If one 120 Ω resistor termination is mixed in":
    "Se houver uma terminação de resistor de 120 Ω misturada",
  "Close to the DC value of a bus with RC termination only — no sign of a resistor termination mixed in (in this measurement).":
    "Perto do valor em CC de um barramento só com terminação RC — sem sinal de terminação de resistor misturada (nesta medição).",
  "RC termination itself cannot be confirmed with DC — check the switch or parts at both end devices.":
    "A terminação RC em si não pode ser confirmada em CC — confira a chave ou os componentes dos dois equipamentos das pontas.",
  "OL can also mean the line is broken part-way — measure again at the end device's terminals.":
    "OL também pode indicar a linha rompida no meio do caminho — meça de novo nos bornes do equipamento da ponta.",
  "An RC-terminated bus, but a resistor termination shows (≈ {} Ω or less).":
    "Barramento com terminação RC, mas aparece uma terminação de resistor (≈ {0} Ω ou menos).",
  "A device or adapter may have its 120 Ω termination switch on, or a resistor termination is mixed in. Turn it off if it is not at an end.":
    "Um equipamento ou o conversor pode estar com a chave de terminação de 120 Ω ligada, ou há uma terminação de resistor misturada. Desligue-a se não estiver numa ponta.",
  "Stop polling while measuring — if anyone is transmitting, the reading jumps around.":
    "Pare o polling durante a medição — se alguém estiver transmitindo, a leitura fica pulando.",
  "+200 mV or more — receivers see a defined «1» (mark) while the bus is idle.":
    "+200 mV ou mais — com o barramento em repouso os receptores veem um «1» (marca) definido.",
  "Within ±200 mV — receivers have no defined state while the bus is idle.":
    "Dentro de ±200 mV — com o barramento em repouso os receptores não têm estado definido.",
  "Bias (fail-safe) resistors are missing, or too large for the 60 Ω termination. The first byte may be garbled or noise read as bytes.":
    "Faltam os resistores de polarização (fail-safe), ou eles são grandes demais para a terminação de 60 Ω. O primeiro byte pode chegar corrompido ou o ruído ser lido como bytes.",
  "Many newer transceivers have fail-safe receivers that read 0 V as «1», so it may still work. Use the RS-485 calculator to size bias resistors.":
    "Muitos transceptores mais novos têm receptores fail-safe que leem 0 V como «1», então pode funcionar mesmo assim. Use a calculadora de RS-485 para dimensionar os resistores de polarização.",
  "−200 mV or lower — the idle state reads inverted («0»).":
    "−200 mV ou menos — o estado de repouso é lido invertido («0»).",
  "First check the probes (red = B · D1 · +). If they are right, the A/B at the bias side may be swapped, or a device is stuck transmitting.":
    "Primeiro confira as pontas de prova (vermelha = B · D1 · +). Se estiverem certas, A/B podem estar trocados do lado da polarização, ou um equipamento ficou preso transmitindo.",
  "Some vendors label A and B the other way round — if nothing replies, swapping the two wires is a valid test (it does not damage devices).":
    "Alguns fabricantes rotulam A e B ao contrário — se ninguém responder, trocar os dois fios é um teste válido (não danifica os equipamentos).",
  "Common mode (A+B)/2":
    "Modo comum (A+B)/2",
  "Outside −7 to +12 V — receivers may not decode correctly or may be damaged.":
    "Fora de −7 a +12 V — os receptores podem não decodificar direito ou ser danificados.",
  "The SG (common) wire may be missing so device grounds sit at different potentials, or another supply such as 24 V touches the line. Measure the ground-to-ground difference too.":
    "O fio SG (comum) pode estar faltando, deixando os terras dos equipamentos em potenciais diferentes, ou outra fonte, como a de 24 V, está encostando na linha. Meça também a diferença entre terras.",
  "Between distant devices, an isolated adapter or repeater is the usual remedy.":
    "Entre equipamentos distantes, a solução usual é um conversor ou repetidor isolado.",
  "Inside −7 to +12 V but close to the edge.":
    "Dentro de −7 a +12 V, mas perto do limite.",
  "It usually sits between 0 and 5 V. Re-measure while motors run, when it can drift further. Check the SG wire.":
    "Costuma ficar entre 0 e 5 V. Meça de novo com os motores funcionando, quando pode se afastar mais. Confira o fio SG.",
  "Within the common-mode range (−7 to +12 V).":
    "Dentro da faixa de modo comum (−7 a +12 V).",
  "Without an SG connection the reading floats and changes between measurements — check the SG wire first in that case.":
    "Sem ligação SG a leitura flutua e muda entre medições — nesse caso confira primeiro o fio SG.",
  "Percent of span":
    "Porcentagem da faixa",
  "Measure mA by breaking the loop and putting the meter in series, or divide the voltage across the receiver resistor (e.g. 250 Ω) by its value.":
    "Meça os mA abrindo o loop e colocando o multímetro em série, ou divida a tensão sobre o resistor de carga (ex.: 250 Ω) pelo valor dele.",
  "No current — the loop is open or has no supply.":
    "Sem corrente — o loop está aberto ou sem alimentação.",
  "For 2-wire, check reversed polarity, fuses, loose terminals and the loop supply. A 4-wire (separately powered) device may be wired like a 2-wire one.":
    "A 2 fios, confira polaridade invertida, fusíveis, bornes frouxos e a fonte do loop. Um equipamento a 4 fios (alimentação separada) pode estar ligado como um de 2 fios.",
  "Negative — the probes are reversed or current flows the wrong way.":
    "Negativo — as pontas de prova estão invertidas ou a corrente circula ao contrário.",
  "3.6 mA or less — the NE 43 low failure-signal range.":
    "3,6 mA ou menos — faixa de sinal de falha baixo da NE 43.",
  "The transmitter may be signalling a sensor fault (broken sensor wire etc.), or the loop voltage is too low for it to drive current. Check the transmitter display or diagnostics.":
    "O transmissor pode estar sinalizando falha do sensor (fio do sensor rompido etc.), ou a tensão do loop está baixa demais para ele fornecer corrente. Confira o display ou o diagnóstico do transmissor.",
  "3.6–3.8 mA — neither the measurement range (3.8–20.5 mA) nor a failure signal.":
    "3,6–3,8 mA — nem faixa de medição (3,8–20,5 mA) nem sinal de falha.",
  "Check the failure-signal setting in the transmitter manual (some products use values other than 3.6 mA).":
    "Confira a configuração de sinal de falha no manual do transmissor (alguns produtos usam valores diferentes de 3,6 mA).",
  "Below 4 mA — under range but inside the NE 43 measurement range (down to 3.8 mA).":
    "Abaixo de 4 mA — abaixo da faixa, mas dentro da faixa de medição da NE 43 (até 3,8 mA).",
  "The process value may be below the range or the zero may be off.":
    "O valor de processo pode estar abaixo da faixa, ou o zero está desajustado.",
  "Within 4–20 mA.":
    "Dentro de 4–20 mA.",
  "If the PLC or display shows something else, check the scaling (range) and input type (current/voltage).":
    "Se o CLP ou o indicador mostrarem outra coisa, confira o escalonamento (faixa) e o tipo de entrada (corrente/tensão).",
  "Above 20 mA — over range but inside the NE 43 measurement range (up to 20.5 mA).":
    "Acima de 20 mA — acima da faixa, mas dentro da faixa de medição da NE 43 (até 20,5 mA).",
  "The process value may exceed the range or the span may be off.":
    "O valor de processo pode passar da faixa, ou o span está desajustado.",
  "20.5–21 mA — neither the measurement range nor a failure signal.":
    "20,5–21 mA — nem faixa de medição nem sinal de falha.",
  "21 mA or more — the NE 43 high failure-signal range.":
    "21 mA ou mais — faixa de sinal de falha alto da NE 43.",
  "The transmitter may be signalling a fault (failure set to «upscale»).":
    "O transmissor pode estar sinalizando falha (falha configurada como «fundo de escala alto»).",
  "The transmitter may be signalling a fault (failure set to «upscale»). Well above 25 mA, also suspect wiring where the supply bypasses the transmitter (a short).":
    "O transmissor pode estar sinalizando falha (falha configurada como «fundo de escala alto»). Bem acima de 25 mA, suspeite também de ligação em que a fonte contorna o transmissor (curto).",
  "Drop":
    "Queda",
  "Allowed range (−15 % to +20 %)":
    "Faixa permitida (−15 % a +20 %)",
  "Measure at the device terminals, not at the power supply, with the load (valves, relays, brakes …) switched on.":
    "Meça nos bornes do equipamento, não na fonte, com a carga (válvulas, relés, freios …) acionada.",
  "More than 20 % above nominal.":
    "Mais de 20 % acima do nominal.",
  "Check the supply's voltage adjustment (ADJ) and rating.":
    "Confira o ajuste de tensão (ADJ) e os valores nominais da fonte.",
  "Drop is 5 % or less.":
    "Queda de 5 % ou menos.",
  "5–15 % drop — still within the allowed range but with less margin.":
    "Queda de 5–15 % — ainda dentro da faixa permitida, mas com menos margem.",
  "The wire may be long or thin, or a terminal may have contact resistance. Check whether it drops further when loads switch on together.":
    "O fio pode ser longo ou fino, ou um borne pode ter resistência de contato. Veja se cai mais quando as cargas acionam juntas.",
  "Drop over 15 % — below the usual lower limit for 24 V DC equipment (20.4 V).":
    "Queda acima de 15 % — abaixo do limite inferior usual de equipamentos de 24 Vcc (20,4 V).",
  "Check wire size and length, supply capacity (including inrush) and loose terminals. Re-size the wire with the voltage drop calculator.":
    "Confira bitola e comprimento do fio, capacidade da fonte (incluindo a corrente de partida) e bornes frouxos. Redimensione o fio com a calculadora de queda de tensão.",
  "Voltage across the PLC input (approx.)":
    "Tensão na entrada do CLP (aprox.)",
  "Check the black probe is on the sensor 0 V (blue) and the red on the output (black).":
    "Confira se a ponta preta está no 0 V do sensor (azul) e a vermelha na saída (preto).",
  "NPN pulls the output towards 0 V when on. The PLC input COM must be +24 V; measured with the output disconnected from the PLC, the off state floats and can read like 0 V.":
    "O NPN puxa a saída para 0 V quando ativo. O COM das entradas do CLP precisa estar em +24 V; medido com a saída desligada do CLP, o estado desativado flutua e pode parecer 0 V.",
  "PNP pulls the output up to the supply (+24 V) when on. The PLC input COM must be 0 V.":
    "O PNP leva a saída à alimentação (+24 V) quando ativo. O COM das entradas do CLP precisa estar em 0 V.",
  "Thresholds (15 V, 11 V, 5 V) are for 24 V DC inputs — for other voltages use the input card manual.":
    "Os limiares (15 V, 11 V, 5 V) são para entradas de 24 Vcc — para outras tensões, use o manual do cartão de entradas.",
  "Above 30 V — beyond the ON range of a 24 V DC input (15–30 V). Check the supply voltage.":
    "Acima de 30 V — além da faixa ON de uma entrada de 24 Vcc (15–30 V). Confira a tensão de alimentação.",
  "A voltage read as ON (15 V or more is ON for input types 1, 2 and 3).":
    "Tensão lida como ON (15 V ou mais é ON para entradas dos tipos 1, 2 e 3).",
  "11–15 V — ON for type 2/3 inputs, undefined for type 1 inputs.":
    "11–15 V — ON para entradas dos tipos 2/3, indefinido para entradas do tipo 1.",
  "The sensor's residual voltage may be high or the supply low. Measure the sensor supply (brown–blue) too.":
    "A tensão residual do sensor pode estar alta ou a alimentação baixa. Meça também a alimentação do sensor (marrom–azul).",
  "5–11 V — neither ON nor OFF.":
    "5–11 V — nem ON nem OFF.",
  "Check the input COM, the sensor's output current versus what the input needs, and supply drop.":
    "Confira o COM das entradas, a corrente de saída do sensor frente ao que a entrada precisa, e a queda da alimentação.",
  "The sensor is on but the PLC input sees almost no voltage (reads OFF).":
    "O sensor está ativo, mas a entrada do CLP quase não vê tensão (lida como OFF).",
  "The NPN/PNP type and input COM polarity may be mismatched, or the output wire goes to another input or is broken.":
    "O tipo NPN/PNP e a polaridade do COM das entradas podem não combinar, ou o fio de saída vai para outra entrada ou está rompido.",
  "A voltage read as OFF (5 V or less).":
    "Tensão lida como OFF (5 V ou menos).",
  "5–11 V — undefined while it should be OFF.":
    "5–11 V — indefinido quando deveria estar OFF.",
  "Could be leakage from a 2-wire sensor or induced voltage on long parallel wiring. See whether the manual suggests a bleeder resistor across the input.":
    "Pode ser a fuga de um sensor a 2 fios ou tensão induzida em fiação longa em paralelo. Veja se o manual sugere um resistor de dreno em paralelo com a entrada.",
  "The sensor is off but the PLC input sees an ON voltage.":
    "O sensor está desativado, mas a entrada do CLP vê uma tensão de ON.",
  "Check for a shorted output (touching +24 V or 0 V), swapped NPN/PNP, and the sensor output mode (NO/NC, light-on/dark-on).":
    "Procure saída em curto (encostando em +24 V ou 0 V), NPN/PNP trocados e o modo de saída do sensor (NA/NF, light-on/dark-on).",
  "On a PC (DTE) DB9, pin 3 is TXD and pin 5 GND. On a device (DCE), TXD is often pin 2.":
    "No DB9 de um PC (DTE), o pino 3 é TXD e o 5 é GND. Num equipamento (DCE), o TXD costuma ser o pino 2.",
  "Beyond ±25 V — outside the RS-232 maximum.":
    "Além de ±25 V — fora do máximo do RS-232.",
  "Check the meter range and probe position — it may be a supply pin, not RS-232.":
    "Confira a escala do multímetro e a posição das pontas — pode ser um pino de alimentação, não RS-232.",
  "Below −15 V — beyond the normal output (−5 to −15 V) but within ±25 V.":
    "Abaixo de −15 V — além da saída típica (−5 a −15 V), mas dentro de ±25 V.",
  "−5 to −15 V — an RS-232 transmitter at idle (mark).":
    "−5 a −15 V — um transmissor RS-232 em repouso (marca).",
  "−3 to −5 V — past the receive threshold (−3 V) but below the transmit spec (−5 V).":
    "−3 a −5 V — passa do limiar de recepção (−3 V), mas não chega à especificação de transmissão (−5 V).",
  "Common on weakly powered adapters and laptop ports. With long cables the far end may not see enough voltage.":
    "Comum em adaptadores com pouca alimentação e em portas de notebooks. Com cabos longos, a outra ponta pode não receber tensão suficiente.",
  "−3 to +3 V — not a defined RS-232 level.":
    "−3 a +3 V — não é um nível RS-232 definido.",
  "It may not be the TXD pin (check 2 vs 3), or the driver is off or faulty. Some adapters only drive TX once the port is open — re-measure with a terminal program holding the port open.":
    "Pode não ser o pino TXD (confira 2 e 3), ou o driver está desligado ou com defeito. Alguns adaptadores só acionam o TX com a porta aberta — meça de novo com um programa de terminal mantendo a porta aberta.",
  "+3 to +5.5 V — looks like a TTL (3.3/5 V) UART rather than RS-232.":
    "+3 a +5,5 V — parece uma UART TTL (3,3/5 V), não RS-232.",
  "TTL idles high. Wiring it straight to an RS-232 port does not work and can damage the device — use a TTL USB adapter (3.3 V/5 V).":
    "Em TTL o repouso é nível alto. Ligar direto numa porta RS-232 não funciona e pode danificar o equipamento — use um adaptador USB TTL (3,3 V/5 V).",
  "Positive voltage — TXD is not at idle (negative).":
    "Tensão positiva — o TXD não está em repouso (negativo).",
  "A break (continuous 0) may be in progress, or the pin is a control line such as RTS (7) or DTR (4) that goes positive when asserted.":
    "Pode haver um break (0 contínuo) em andamento, ou o pino é uma linha de controle como RTS (7) ou DTR (4), que fica positiva quando ativada.",
  "Measure both DC (V⎓) and AC (V~) and enter the larger. Repeat with equipment on and motors running.":
    "Meça em CC (V⎓) e em CA (V~) e informe o maior. Repita com os equipamentos ligados e os motores funcionando.",
  "Under 1 V — generally not enough to disturb communication.":
    "Menos de 1 V — em geral não basta para atrapalhar a comunicação.",
  "1–7 V — eats into the RS-485 common-mode margin (−7 to +12 V).":
    "1–7 V — consome a margem de modo comum do RS-485 (−7 a +12 V).",
  "With non-isolated USB adapters and RS-232, this difference drives current through signal ground, causing drops and noise. Check the SG wire, single-point grounding, and an isolated adapter.":
    "Com adaptadores USB não isolados e com RS-232, essa diferença faz corrente circular pelo terra de sinal, causando quedas e ruído. Confira o fio SG, o aterramento em um só ponto e um adaptador isolado.",
  "7 V or more — the grounds differ a lot.":
    "7 V ou mais — os terras diferem muito.",
  "It can exceed the RS-485 common-mode range and push current through comms and USB, damaging ports. Have an electrician check for a missing PE connection or leakage; until then, connect through an isolated adapter.":
    "Pode passar da faixa de modo comum do RS-485 e fazer corrente circular pela comunicação e pelo USB, danificando portas. Peça a um eletricista qualificado que verifique se falta a ligação PE ou se há fuga; até lá, ligue através de um adaptador isolado.",
  "No issue found (in this measurement)":
    "Nenhum problema encontrado (nesta medição)",
  "Worth a look":
    "Vale conferir",
  "Problem":
    "Problema",
};
