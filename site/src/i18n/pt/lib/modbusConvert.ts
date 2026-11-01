// lib/modbusConvert.ts e conversor de quadros Modbus RTU ↔ TCP (views/ModbusRtuTcpPage.astro) — frase em inglês → português do Brasil
// Termos: endereço do escravo, Unit ID, ID de transação, gateway, broadcast
export default {
  "0 — broadcast (writes only, nobody replies)":
    "0 — broadcast (só escritas, ninguém responde)",
  "{} — reserved on a serial line (device addresses are 1 to 247)":
    "{0} — reservado em linha serial (os endereços dos equipamentos vão de 1 a 247)",
  "0 — depending on the gateway, forwarded as a serial broadcast or taken as the gateway itself":
    "0 — conforme o gateway, é repassado como broadcast serial ou tratado como o próprio gateway",
  "255 (FF) — recommended for a TCP device addressed directly; a gateway usually does not forward it to the serial line":
    "255 (FF) — recomendado para um equipamento TCP acessado diretamente; um gateway normalmente não o repassa para a linha serial",
  "{} — outside serial addresses (1 to 247), so a gateway may not forward it":
    "{0} — fora dos endereços seriais (1 a 247), então um gateway pode não repassá-lo",
  "{} — address of the serial device behind the gateway":
    "{0} — endereço do equipamento serial atrás do gateway",
  "Rest":
    "Resto",
  "{} bytes":
    "{0} bytes",
  "An ASCII frame starts with «:»":
    "Um quadro ASCII começa com «:»",
  "Enter a frame":
    "Informe um quadro",
  "Format chosen by hand":
    "Formato escolhido manualmente",
  "Starts with «:», so read as ASCII":
    "Começa com «:», então foi lido como ASCII",
  "The CRC matches, so read as RTU (an MBAP header also fits — pick TCP if that is wrong)":
    "O CRC confere, então foi lido como RTU (um cabeçalho MBAP também se encaixa — escolha TCP se estiver errado)",
  "The trailing 2-byte CRC matches, so read as RTU":
    "O CRC dos 2 últimos bytes confere, então foi lido como RTU",
  "Protocol ID is 0 and the length field equals the remaining byte count, so read as TCP":
    "O ID de protocolo é 0 e o campo de comprimento é igual ao número de bytes restantes, então foi lido como TCP",
  "Neither the CRC nor an MBAP header fits — read as RTU with a bad CRC":
    "Nem o CRC nem um cabeçalho MBAP se encaixam — lido como RTU com CRC errado",
  "An RTU frame is at least 4 bytes: address, function and a 2-byte CRC":
    "Um quadro RTU tem no mínimo 4 bytes: endereço, função e CRC de 2 bytes",
  "Slave address":
    "Endereço do escravo",
  "OK (low byte first)":
    "Confere (byte baixo primeiro)",
  "mismatch — correct value {}":
    "não confere — valor correto {0}",
  "CRC mismatch — received {}, correct {}. The last 2 bytes were taken as the CRC and dropped":
    "CRC não confere — recebido {0}, correto {1}. Os 2 últimos bytes foram tomados como CRC e removidos",
  "An RTU frame is at most 256 bytes (got {})":
    "Um quadro RTU tem no máximo 256 bytes (recebidos {0})",
  "A Modbus TCP frame is at least 8 bytes: the 7-byte MBAP header plus a function code":
    "Um quadro Modbus TCP tem no mínimo 8 bytes: o cabeçalho MBAP de 7 bytes mais o código de função",
  "Transaction ID":
    "ID de transação",
  "{} — the response repeats the request's number":
    "{0} — a resposta repete o número da requisição",
  "Protocol ID":
    "ID de protocolo",
  "{} — must be 0":
    "{0} — precisa ser 0",
  "Length":
    "Comprimento",
  "{} — Unit ID to the end (matches)":
    "{0} — do Unit ID até o fim (confere)",
  "{} — {} bytes follow (mismatch)":
    "{0} — seguem {1} bytes (não confere)",
  "Unit ID":
    "Unit ID",
  "Protocol ID is not 0 — this may not be Modbus":
    "O ID de protocolo não é 0 — pode não ser Modbus",
  "The length field ({}) differs from the bytes that follow ({}) — the frame may be cut off or two frames joined. Converted using the actual bytes":
    "O campo de comprimento ({0}) difere dos bytes que vêm depois ({1}) — o quadro pode estar cortado ou dois quadros juntos. Convertido com os bytes reais",
  "The HEX characters after «:» must come in pairs (2 per byte)":
    "Os caracteres HEX depois de «:» precisam vir em pares (2 por byte)",
  "Not a HEX digit: «{}»":
    "Não é um dígito HEX: «{0}»",
  "An ASCII frame is at least 3 bytes (6 characters): address, function and LRC":
    "Um quadro ASCII tem no mínimo 3 bytes (6 caracteres): endereço, função e LRC",
  "Start":
    "Início",
  "3A — frame start":
    "3A — início do quadro",
  "OK":
    "Confere",
  "End":
    "Fim",
  "LRC mismatch — received {}, correct {}. The last byte was taken as the LRC and dropped":
    "LRC não confere — recebido {0}, correto {1}. O último byte foi tomado como LRC e removido",
  "The trailing CR LF (0D 0A) is missing — it must be sent":
    "Falta o CR LF final (0D 0A) — ele precisa ser enviado",
  "The specification sends HEX in upper case — some devices reject lower case":
    "A especificação envia o HEX em maiúsculas — alguns equipamentos recusam minúsculas",
  "No function code":
    "Sem código de função",
  "CRC16 0x{}{} — low byte first":
    "CRC16 0x{0}{1} — byte baixo primeiro",
  "{} — Unit ID 1 + PDU {}":
    "{0} — Unit ID 1 + PDU {1}",
  "Two's complement of the address + PDU byte sum":
    "Complemento de dois da soma dos bytes de endereço + PDU",
  "Slave address {} became the Unit ID. Through a gateway this becomes the address on the serial side":
    "O endereço do escravo {0} virou o Unit ID. Através de um gateway, ele será o endereço do lado serial",
  "The sender picks the Transaction ID — for a response, use the number from its request":
    "Quem envia escolhe o ID de transação — numa resposta, use o número da requisição correspondente",
  "Unit ID {} became the slave address. The Transaction ID ({}) has no place in a serial frame and is dropped":
    "O Unit ID {0} virou o endereço do escravo. O ID de transação ({1}) não tem lugar num quadro serial e foi descartado",
  "Address 0 is a broadcast on a serial line — every device acts on it and none replies (read requests cannot be broadcast)":
    "O endereço 0 é broadcast numa linha serial — todos os equipamentos executam e nenhum responde (requisições de leitura não podem ser broadcast)",
  "Address {} is not used on a serial line (1 to 247). Change it to the device's address":
    "O endereço {0} não é usado em linha serial (1 a 247). Troque pelo endereço do equipamento",
  "Function {} ({}) is serial-line only — a TCP device may reject it":
    "A função {0} ({1}) é só de linha serial — um equipamento TCP pode recusá-la",
  "The PDU is {} bytes, over the 253-byte maximum":
    "A PDU tem {0} bytes, acima do máximo de 253 bytes",
  "Field":
    "Campo",
  "Bytes":
    "Bytes",
  "Value":
    "Valor",
  "Copy":
    "Copiar",
  "Copied":
    "Copiado",
  "Copy failed — select it by hand":
    "Não foi possível copiar — selecione manualmente",
  "Transaction ID must be a number from 0 to 65535":
    "O ID de transação precisa ser um número de 0 a 65535",
  "Input":
    "Entrada",
  "bytes":
    "bytes",
  "Bytes on the wire: {}":
    "Bytes na linha: {0}",
};
