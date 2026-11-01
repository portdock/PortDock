// lib/canFrame.ts e decodificador de quadros CAN (views/CanDecoderPage.astro) — frase em inglês → português do Brasil
// Termos: dicionário de objetos, heartbeat, boot-up, operacional, pré-operacional, bits de preenchimento (stuffing), endereço de origem/destino
export default {
  "Device type":
    "Tipo de dispositivo (Device type)",
  "Error register":
    "Registro de erros (Error register)",
  "Pre-defined error field":
    "Campo de erros predefinido (Pre-defined error field)",
  "Manufacturer device name":
    "Nome do dispositivo do fabricante",
  "Manufacturer hardware version":
    "Versão de hardware do fabricante",
  "Manufacturer software version":
    "Versão de software do fabricante",
  "Store parameters":
    "Salvar parâmetros (Store parameters)",
  "Restore default parameters":
    "Restaurar parâmetros padrão (Restore default parameters)",
  "Consumer heartbeat time":
    "Tempo de heartbeat do consumidor",
  "Producer heartbeat time (ms)":
    "Tempo de heartbeat do produtor (ms)",
  "Identity object":
    "Objeto de identidade (Identity: fabricante, produto, revisão, número de série)",
  "RPDO{} communication parameter":
    "Parâmetro de comunicação do RPDO{0}",
  "RPDO{} mapping":
    "Mapeamento do RPDO{0}",
  "TPDO{} communication parameter":
    "Parâmetro de comunicação do TPDO{0}",
  "TPDO{} mapping":
    "Mapeamento do TPDO{0}",
  "Manufacturer-specific area":
    "Área específica do fabricante",
  "Standardized device profile area (CiA 4xx)":
    "Área de perfis de dispositivo padronizados (CiA 4xx)",
  "Communication profile area":
    "Área do perfil de comunicação",
  "Request":
    "Requisição",
  "Acknowledgment":
    "Confirmação (Acknowledgment)",
  "Address Claimed":
    "Endereço reivindicado (Address Claimed)",
  "Transport Protocol — Connection Management":
    "Protocolo de transporte — gerenciamento da conexão",
  "Transport Protocol — Data Transfer":
    "Protocolo de transporte — transferência de dados",
  "Proprietary A":
    "Proprietário A (Proprietary A)",
  "Electronic Brake Controller 1":
    "Controlador eletrônico de freios 1",
  "Electronic Transmission Controller 1":
    "Controlador eletrônico da transmissão 1",
  "Electronic Engine Controller 2 (accelerator pedal)":
    "Controlador eletrônico do motor 2 (pedal do acelerador)",
  "Electronic Engine Controller 1 (engine speed, torque)":
    "Controlador eletrônico do motor 1 (rotação, torque)",
  "Electronic Transmission Controller 2 (gear)":
    "Controlador eletrônico da transmissão 2 (marcha)",
  "Active Diagnostic Trouble Codes (DM1)":
    "Códigos de falha ativos (DM1)",
  "Previously Active Diagnostic Trouble Codes (DM2)":
    "Códigos de falha anteriores (DM2)",
  "Vehicle Distance":
    "Distância percorrida pelo veículo",
  "High Resolution Vehicle Distance":
    "Distância percorrida em alta resolução",
  "Engine Hours, Revolutions":
    "Horas e rotações do motor",
  "Time/Date":
    "Hora/data",
  "Fuel Consumption (Liquid)":
    "Consumo de combustível (líquido)",
  "Component Identification":
    "Identificação de componentes",
  "Vehicle Identification":
    "Identificação do veículo (VIN)",
  "Software Identification":
    "Identificação do software",
  "Engine Temperature 1":
    "Temperatura do motor 1 (arrefecimento, combustível, óleo)",
  "Engine Fluid Level/Pressure 1":
    "Nível/pressão de fluidos do motor 1 (pressão do óleo)",
  "Cruise Control/Vehicle Speed 1":
    "Piloto automático/velocidade do veículo 1",
  "Fuel Economy (Liquid)":
    "Economia de combustível (líquido)",
  "Ambient Conditions":
    "Condições ambientes (pressão atmosférica, temperatura externa)",
  "Intake/Exhaust Conditions 1":
    "Condições de admissão/escape 1",
  "Vehicle Electrical Power 1":
    "Alimentação elétrica do veículo 1 (tensão da bateria)",
  "Transmission Fluids 1":
    "Fluidos da transmissão 1 (pressão, temperatura)",
  "Diagnostic Data Clear (DM3)":
    "Limpeza dos dados de diagnóstico (DM3)",
  "Dash Display":
    "Display do painel (nível de combustível)",
  "Proprietary B":
    "Proprietário B (Proprietary B)",
  "Proprietary A2":
    "Proprietário A2",
  "Actual engine percent torque":
    "Torque real do motor em porcentagem",
  "Engine speed":
    "Rotação do motor",
  "Accelerator pedal position 1":
    "Posição do pedal do acelerador 1",
  "Engine coolant temperature":
    "Temperatura do líquido de arrefecimento do motor",
  "Engine oil pressure":
    "Pressão do óleo do motor",
  "Engine total hours of operation":
    "Total de horas de funcionamento do motor",
  "Start remote node (→ Operational)":
    "Iniciar nó remoto (Start remote node → operacional)",
  "Stop remote node (→ Stopped)":
    "Parar nó remoto (Stop remote node → parado)",
  "Enter Pre-operational":
    "Entrar em pré-operacional (Enter Pre-operational)",
  "Reset node":
    "Reiniciar nó (Reset node)",
  "Reset communication":
    "Reiniciar comunicação (Reset communication)",
  "Boot-up":
    "Boot-up",
  "Stopped":
    "Parado (Stopped)",
  "Operational":
    "Operacional (Operational)",
  "Pre-operational":
    "Pré-operacional (Pre-operational)",
  "Toggle bit not alternated":
    "O bit de alternância não alternou",
  "SDO protocol timed out":
    "Tempo do protocolo SDO esgotado",
  "Client/server command specifier not valid or unknown":
    "Especificador de comando cliente/servidor inválido ou desconhecido",
  "Out of memory":
    "Memória insuficiente",
  "Unsupported access to an object":
    "Acesso não suportado a um objeto",
  "Attempt to read a write only object":
    "Tentativa de ler um objeto somente de escrita",
  "Attempt to write a read only object":
    "Tentativa de escrever um objeto somente de leitura",
  "Object does not exist in the object dictionary":
    "O objeto não existe no dicionário de objetos",
  "Object cannot be mapped to the PDO":
    "O objeto não pode ser mapeado no PDO",
  "Number and length of objects would exceed PDO length":
    "O número e o tamanho dos objetos excederiam o tamanho do PDO",
  "General parameter incompatibility":
    "Incompatibilidade geral de parâmetros",
  "General internal incompatibility in the device":
    "Incompatibilidade interna geral no dispositivo",
  "Access failed due to a hardware error":
    "Falha de acesso por erro de hardware",
  "Data type does not match, length of service parameter does not match":
    "O tipo de dados não confere — o tamanho do parâmetro de serviço não confere",
  "Data type does not match, length too high":
    "O tipo de dados não confere — tamanho grande demais",
  "Data type does not match, length too low":
    "O tipo de dados não confere — tamanho pequeno demais",
  "Sub-index does not exist":
    "O subíndice não existe",
  "Invalid value for parameter":
    "Valor inválido para o parâmetro",
  "Value of parameter written too high":
    "Valor escrito do parâmetro alto demais",
  "Value of parameter written too low":
    "Valor escrito do parâmetro baixo demais",
  "General error":
    "Erro geral",
  "Data cannot be transferred or stored to the application":
    "Os dados não podem ser transferidos nem gravados na aplicação",
  "Data cannot be transferred or stored because of local control":
    "Os dados não podem ser transferidos nem gravados por causa do controle local",
  "Data cannot be transferred or stored because of the present device state":
    "Os dados não podem ser transferidos nem gravados por causa do estado atual do dispositivo",
  "J1939 engine speed":
    "Rotação do motor J1939",
  "J1939 request":
    "Requisição J1939",
  "CANopen SDO read":
    "Leitura SDO CANopen",
  "CANopen NMT, heartbeat":
    "NMT e heartbeat CANopen",
  "SDO abort":
    "Aborto SDO",
  "Raw bit stream":
    "Sequência de bits bruta",
  "Standard 11-bit":
    "Padrão de 11 bits",
  "Extended 29-bit":
    "Estendido de 29 bits",
  "Remote (RTR)":
    "Remoto (RTR)",
  "Data":
    "Dados",
  "Format":
    "Formato",
  "DLC → length":
    "DLC → tamanho",
  "Bits given":
    "Bits informados",
  "Stuff bits":
    "Bits de preenchimento",
  "at":
    "posições",
  "Stuff error (six equal bits) at":
    "Erro de preenchimento (seis bits iguais) na posição",
  "CRC15 received / computed":
    "CRC15 recebido / calculado",
  "match":
    "confere",
  "mismatch":
    "não confere",
  "CRC delimiter · ACK · ACK delimiter":
    "Delimitador de CRC · ACK · delimitador de ACK",
  "EOF 1s":
    "EOF em 1",
  "ACK slot is 1 — no receiver acknowledged":
    "O slot ACK está em 1 — nenhum receptor confirmou",
  "J1939 candidate":
    "Possível J1939",
  "Priority":
    "Prioridade",
  "Source address (SA)":
    "Endereço de origem (SA)",
  "Destination (DA)":
    "Destino (DA)",
  "Global (255)":
    "Global (255)",
  "Not in this table":
    "Não está nesta tabela",
  "Not available (0xFF)":
    "Não disponível (0xFF)",
  "Error (0xFE)":
    "Erro (0xFE)",
  "Data too short":
    "Dados curtos demais",
  "SPN values":
    "Valores dos SPNs",
  "CANopen candidate":
    "Possível CANopen",
  "Function":
    "Função",
  "Node ID":
    "ID do nó",
  "NMT command":
    "Comando NMT",
  "SDO response (server → client)":
    "Resposta SDO (servidor → cliente)",
  "SDO request (client → server)":
    "Requisição SDO (cliente → servidor)",
  "NMT error control (heartbeat, boot-up)":
    "Controle de erros NMT (heartbeat, boot-up)",
  "Outside the predefined set (vendor or custom)":
    "Fora do conjunto predefinido (do fabricante ou próprio)",
  "Command":
    "Comando",
  "Target node":
    "Nó de destino",
  "State":
    "Estado",
  "Error code":
    "Código de erro",
  "Error register (1001h)":
    "Registro de erros (1001h)",
  "Manufacturer field":
    "Campo do fabricante",
  "Initiate download (write)":
    "Iniciar download (escrita)",
  "Download (write) confirmed":
    "Download (escrita) confirmado",
  "Initiate upload (read request)":
    "Iniciar upload (requisição de leitura)",
  "Upload (read) response":
    "Resposta de upload (leitura)",
  "Download segment":
    "Segmento de download",
  "Download segment response":
    "Resposta ao segmento de download",
  "Upload segment request":
    "Requisição de segmento de upload",
  "Upload segment":
    "Segmento de upload",
  "Abort":
    "Aborto",
  "Block transfer":
    "Transferência em bloco",
  "Unknown command":
    "Comando desconhecido",
  "Command byte":
    "Byte de comando",
  "Object":
    "Objeto",
  "Expedited, data":
    "Expedita, dados",
  "Segmented, total size":
    "Segmentada, tamanho total",
  "Segment data":
    "Dados do segmento",
  "last":
    "último",
  "toggle":
    "alternância",
  "Abort code":
    "Código de aborto",
  "PDO data can only be decoded with its mapping (1600h–, 1A00h–)":
    "Os dados de um PDO só podem ser decodificados com o mapeamento dele (1600h–, 1A00h–)",
  "Not enough bits":
    "Bits insuficientes",
  "No SOF (0)":
    "Sem SOF (0)",
  "Check the hex bytes":
    "Confira os bytes hex",
  "candump IDs are 3 digits (standard) or 8 (extended)":
    "Os IDs do candump têm 3 dígitos (padrão) ou 8 (estendido)",
  "ID out of range":
    "ID fora da faixa",
  "Data too long":
    "Dados longos demais",
  "CAN FD lengths are 0–8, 12, 16, 20, 24, 32, 48, 64":
    "Os tamanhos de CAN FD são 0–8, 12, 16, 20, 24, 32, 48, 64",
  "DLC must be 0–8":
    "O DLC precisa estar entre 0 e 8",
  "DLC and data length differ":
    "O DLC e o tamanho dos dados não conferem",
  "Check the ID":
    "Confira o ID",
  "Cannot read this line":
    "Não foi possível ler esta linha",
  "requested {}":
    "pedidos {0}",
  "Requested PGN":
    "PGN pedido",
  "CANopen decoding needs an 11-bit COB-ID.":
    "Para decodificar CANopen é preciso um COB-ID de 11 bits.",
  "function code":
    "código de função",
  "0 — all nodes":
    "0 — todos os nós",
  " (toggle 1 — node guarding)":
    " (alternância 1 — node guarding)",
  " — error reset / no error":
    " — reset de erro / sem erro",
  "bytes":
    "bytes",
};
