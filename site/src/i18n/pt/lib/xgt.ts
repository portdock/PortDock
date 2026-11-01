// lib/xgtDecode.ts e decodificador XGT (views/XgtDecoderPage.astro) — frase em inglês → português do Brasil
// Termos conforme os manuais da LS ELECTRIC: protocolo dedicado XGT, ID da empresa, instrução, bloco, variável, código de erro, relé auxiliar, relé de retenção
export default {
  "unknown error code":
    "código de erro desconhecido",
  "continuous (block)":
    "contínua (bloco)",
  "unknown type":
    "tipo desconhecido",
  "Read request (continuous)":
    "Requisição de leitura (contínua)",
  "Read request (individual)":
    "Requisição de leitura (individual)",
  "Read response":
    "Resposta de leitura",
  "Write request (continuous)":
    "Requisição de escrita (contínua)",
  "Write request (individual)":
    "Requisição de escrita (individual)",
  "Write response":
    "Resposta de escrita",
  "Status request":
    "Requisição de status",
  "Status response":
    "Resposta de status",
  "unknown instruction":
    "instrução desconhecida",
  "Number of blocks":
    "Número de blocos",
  "Variable length":
    "Tamanho da variável",
  "chars":
    "caracteres",
  "Variable":
    "Variável",
  "Number of data":
    "Número de dados",
  "bytes":
    "bytes",
  "Data to write":
    "Dados a escrever",
  "Data size":
    "Tamanho dos dados",
  "Value":
    "Valor",
  "Shorter than the 20-byte header + 2-byte instruction ({} bytes)":
    "Menor que o cabeçalho de 20 bytes + instrução de 2 bytes ({0} bytes)",
  "Company ID":
    "ID da empresa",
  "not LSIS-XGT/LGIS-GLOFA (error h75)":
    "não é LSIS-XGT/LGIS-GLOFA (erro h75)",
  "PLC info":
    "Informações do CLP",
  "not used in requests (h00)":
    "não usado em requisições (h00)",
  "redundant slave":
    "escravo redundante",
  "single/redundant master":
    "mestre simples/redundante",
  "CPU error":
    "erro de CPU",
  "CPU running normally":
    "CPU funcionando sem erro",
  "state ":
    "estado ",
  "CPU info":
    "Informações da CPU",
  "unknown":
    "desconhecida",
  "Source of frame":
    "Origem do quadro",
  "client → PLC (request)":
    "cliente → CLP (requisição)",
  "PLC → client (response)":
    "CLP → cliente (resposta)",
  "neither h33 nor h11":
    "nem h33 nem h11",
  "Length":
    "Comprimento",
  "bytes (matches)":
    "bytes (confere)",
  "actually {} bytes (error h76)":
    "na verdade {0} bytes (erro h76)",
  "FEnet position":
    "Posição FEnet",
  "base":
    "base",
  "slot":
    "slot",
  "correct (sum of the first 19 bytes)":
    "correto (soma dos 19 primeiros bytes)",
  "differs — computed":
    "difere — calculado",
  " (error h77)":
    " (erro h77)",
  "Instruction":
    "Instrução",
  "Data type":
    "Tipo de dados",
  "Reserved":
    "Reservado",
  "don't care":
    "indiferente",
  "Source of frame is not h33, so PortDock PLC Simulator does not answer it.":
    "A origem do quadro não é h33, então o PortDock PLC Simulator não responde a ele.",
  "If only the BCC is wrong you can test with «Check header BCC» off in the app (the XBL-EMTA manual's table 5-6 example also differs from the header sum).":
    "Se só o BCC estiver errado, você pode testar com «Check header BCC» desligado no programa (o exemplo da tabela 5-6 do manual do XBL-EMTA também difere da soma do cabeçalho).",
  "Out of range (error 4) depends on the device sizes set in the app and is not checked here.":
    "Fora da faixa (erro 4) depende dos tamanhos de dispositivo configurados no programa e não é verificado aqui.",
  "Error status":
    "Status de erro",
  "h0000 normal (ACK)":
    "h0000 sem erro (ACK)",
  "error (NAK)":
    "erro (NAK)",
  "Error code":
    "Código de erro",
  "Could not decode the matching request.":
    "Não foi possível decodificar a requisição correspondente.",
  "Add the matching request to label each byte with its variable.":
    "Acrescente a requisição correspondente para identificar cada byte com a variável dele.",
  "block":
    "bloco",
  "A reply carries no variable names — add the matching request to label each block.":
    "Uma resposta não traz nomes de variável — acrescente a requisição correspondente para identificar cada bloco.",
  "{} bytes left over at the end.":
    "Sobram {0} bytes no fim.",
  "The reply body is shorter than its blocks and data sizes.":
    "O corpo da resposta é menor que os blocos e tamanhos de dados dele.",
  "Enter a variable (e.g. %MW100)":
    "Informe uma variável (ex.: %MW100)",
  "Continuous takes one variable (%MB0 style)":
    "A leitura/escrita contínua aceita uma só variável (no formato %MB0)",
  "Up to 16 variables":
    "Até 16 variáveis",
  "All variables must have the same type letter (X/B/W/D/L)":
    "Todas as variáveis precisam ter a mesma letra de tipo (X/B/W/D/L)",
  "Continuous takes a byte variable (%MB0 style) only":
    "A leitura/escrita contínua aceita só variável de byte (no formato %MB0)",
  "Number of data must be 1–1400 bytes":
    "O número de dados precisa estar entre 1 e 1400 bytes",
  "Continuous write values are bytes (0–255)":
    "Os valores da escrita contínua são bytes (0–255)",
  "Enter one value per variable ({})":
    "Informe um valor por variável ({0})",
  "Value {} is out of range for {}":
    "O valor {0} está fora da faixa para {1}",
  "More than 16 blocks":
    "Mais de 16 blocos",
  "Individual read/write with 0 or more than 16 blocks; continuous with a block count other than 1":
    "Leitura/escrita individual com 0 ou mais de 16 blocos; contínua com número de blocos diferente de 1",
  "Wrong data type":
    "Tipo de dados errado",
  "Data type field not h00–h04 or h14, the variable's type letter (X/B/W/D/L) differs from it, write data size differs from the type, or continuous with a non-byte variable":
    "Campo de tipo de dados fora de h00–h04 e h14, letra de tipo da variável (X/B/W/D/L) diferente dele, tamanho dos dados de escrita diferente do tipo, ou leitura/escrita contínua com variável que não é de byte",
  "Device not serviced":
    "Dispositivo não atendido",
  "Device letter not P/M/K/F/T/C/D/L/N, or the name does not start with «%», is over 16 characters or the number is not decimal":
    "Letra de dispositivo fora de P/M/K/F/T/C/D/L/N, ou nome que não começa com «%», tem mais de 16 caracteres ou número não decimal",
  "Device area exceeded":
    "Área do dispositivo excedida",
  "The number is beyond the device size (set in the app)":
    "O número passa do tamanho do dispositivo (configurado no programa)",
  "Over 1,400 bytes (block)":
    "Mais de 1.400 bytes (bloco)",
  "Continuous read/write of more than 1,400 bytes":
    "Leitura/escrita contínua de mais de 1.400 bytes",
  "Over 1,400 bytes (total)":
    "Mais de 1.400 bytes (total)",
  "(not used by the app — 16 individual blocks never exceed 1,400 bytes)":
    "(não usado pelo programa — 16 blocos individuais nunca passam de 1.400 bytes)",
  "Wrong company ID":
    "ID da empresa errado",
  "The first 10 bytes are neither «LSIS-XGT»+00 00 nor «LGIS-GLOFA»":
    "Os 10 primeiros bytes não são nem «LSIS-XGT»+00 00 nem «LGIS-GLOFA»",
  "Wrong header length":
    "Comprimento do cabeçalho errado",
  "The header length field differs from the bytes that follow, or the body is shorter/longer than the blocks and name lengths say":
    "O campo de comprimento do cabeçalho difere dos bytes que vêm depois, ou o corpo é menor/maior do que indicam os blocos e os tamanhos dos nomes",
  "Wrong header checksum":
    "Checksum do cabeçalho errado",
  "BCC (sum of the first 19 bytes) differs — not checked when «Check header BCC» is off in the app":
    "O BCC (soma dos 19 primeiros bytes) difere — não é verificado com «Check header BCC» desligado no programa",
  "Wrong instruction":
    "Instrução errada",
  "Instruction other than h0054/h0058 (status read h00B0 included)":
    "Instrução diferente de h0054/h0058 (inclusive a leitura de status h00B0)",
  "I/O relay":
    "Relé de E/S",
  "Auxiliary relay":
    "Relé auxiliar",
  "Keep relay":
    "Relé de retenção",
  "Special relay":
    "Relé especial",
  "Timer":
    "Temporizador",
  "Counter":
    "Contador",
  "Data register":
    "Registrador de dados",
  "Link relay":
    "Relé de link",
  "Communication data register":
    "Registrador de dados de comunicação",
  "Field":
    "Campo",
  "Raw":
    "Valor bruto",
  "Meaning":
    "Significado",
  "Request":
    "Requisição",
  "Reply":
    "Resposta",
  "Error code PortDock PLC Simulator would return: ":
    "Código de erro que o PortDock PLC Simulator retornaria: ",
  "none (ACK)":
    "nenhum (ACK)",
  "Header (20 bytes)":
    "Cabeçalho (20 bytes)",
  "Instruction and data":
    "Instrução e dados",
  "Values":
    "Valores",
  "Bytes":
    "Bytes",
  "Decimal":
    "Decimal",
  "Invoke ID must be 0–65535":
    "O Invoke ID precisa estar entre 0 e 65535",
  "Values must be decimal or 0x hex":
    "Os valores precisam ser decimais ou hex com 0x",
};
