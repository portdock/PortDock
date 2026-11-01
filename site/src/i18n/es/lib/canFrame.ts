// lib/canFrame.ts y decodificador de tramas CAN (views/CanDecoderPage.astro) — frase en inglés → español
// Términos: diccionario de objetos, latido (heartbeat), arranque (boot-up), operacional, preoperacional, bits de relleno (stuffing), dirección de origen/destino
export default {
  "Device type":
    "Tipo de dispositivo (Device type)",
  "Error register":
    "Registro de errores (Error register)",
  "Pre-defined error field":
    "Campo de errores predefinido (Pre-defined error field)",
  "Manufacturer device name":
    "Nombre del dispositivo del fabricante",
  "Manufacturer hardware version":
    "Versión de hardware del fabricante",
  "Manufacturer software version":
    "Versión de software del fabricante",
  "Store parameters":
    "Guardar parámetros (Store parameters)",
  "Restore default parameters":
    "Restaurar parámetros por defecto (Restore default parameters)",
  "Consumer heartbeat time":
    "Tiempo de latido del consumidor",
  "Producer heartbeat time (ms)":
    "Tiempo de latido del productor (ms)",
  "Identity object":
    "Objeto de identidad (Identity: fabricante, producto, revisión, número de serie)",
  "RPDO{} communication parameter":
    "Parámetro de comunicación de RPDO{0}",
  "RPDO{} mapping":
    "Mapeo de RPDO{0}",
  "TPDO{} communication parameter":
    "Parámetro de comunicación de TPDO{0}",
  "TPDO{} mapping":
    "Mapeo de TPDO{0}",
  "Manufacturer-specific area":
    "Área específica del fabricante",
  "Standardized device profile area (CiA 4xx)":
    "Área de perfiles de dispositivo normalizados (CiA 4xx)",
  "Communication profile area":
    "Área del perfil de comunicación",
  "Request":
    "Petición",
  "Acknowledgment":
    "Acuse de recibo (Acknowledgment)",
  "Address Claimed":
    "Dirección reclamada (Address Claimed)",
  "Transport Protocol — Connection Management":
    "Protocolo de transporte: gestión de la conexión",
  "Transport Protocol — Data Transfer":
    "Protocolo de transporte: transferencia de datos",
  "Proprietary A":
    "Propietario A (Proprietary A)",
  "Electronic Brake Controller 1":
    "Controlador electrónico de frenos 1",
  "Electronic Transmission Controller 1":
    "Controlador electrónico de la transmisión 1",
  "Electronic Engine Controller 2 (accelerator pedal)":
    "Controlador electrónico del motor 2 (pedal del acelerador)",
  "Electronic Engine Controller 1 (engine speed, torque)":
    "Controlador electrónico del motor 1 (régimen, par)",
  "Electronic Transmission Controller 2 (gear)":
    "Controlador electrónico de la transmisión 2 (marcha)",
  "Active Diagnostic Trouble Codes (DM1)":
    "Códigos de avería activos (DM1)",
  "Previously Active Diagnostic Trouble Codes (DM2)":
    "Códigos de avería anteriores (DM2)",
  "Vehicle Distance":
    "Distancia recorrida por el vehículo",
  "High Resolution Vehicle Distance":
    "Distancia recorrida de alta resolución",
  "Engine Hours, Revolutions":
    "Horas y revoluciones del motor",
  "Time/Date":
    "Hora/fecha",
  "Fuel Consumption (Liquid)":
    "Consumo de combustible (líquido)",
  "Component Identification":
    "Identificación de componentes",
  "Vehicle Identification":
    "Identificación del vehículo (VIN)",
  "Software Identification":
    "Identificación del software",
  "Engine Temperature 1":
    "Temperatura del motor 1 (refrigerante, combustible, aceite)",
  "Engine Fluid Level/Pressure 1":
    "Nivel/presión de fluidos del motor 1 (presión de aceite)",
  "Cruise Control/Vehicle Speed 1":
    "Control de crucero/velocidad del vehículo 1",
  "Fuel Economy (Liquid)":
    "Rendimiento de combustible (líquido)",
  "Ambient Conditions":
    "Condiciones ambientales (presión atmosférica, temperatura exterior)",
  "Intake/Exhaust Conditions 1":
    "Condiciones de admisión/escape 1",
  "Vehicle Electrical Power 1":
    "Alimentación eléctrica del vehículo 1 (tensión de batería)",
  "Transmission Fluids 1":
    "Fluidos de la transmisión 1 (presión, temperatura)",
  "Diagnostic Data Clear (DM3)":
    "Borrado de datos de diagnóstico (DM3)",
  "Dash Display":
    "Pantalla del cuadro de instrumentos (nivel de combustible)",
  "Proprietary B":
    "Propietario B (Proprietary B)",
  "Proprietary A2":
    "Propietario A2",
  "Actual engine percent torque":
    "Par real del motor en porcentaje",
  "Engine speed":
    "Régimen del motor",
  "Accelerator pedal position 1":
    "Posición del pedal del acelerador 1",
  "Engine coolant temperature":
    "Temperatura del refrigerante del motor",
  "Engine oil pressure":
    "Presión de aceite del motor",
  "Engine total hours of operation":
    "Horas totales de funcionamiento del motor",
  "Start remote node (→ Operational)":
    "Arrancar nodo remoto (Start remote node → operacional)",
  "Stop remote node (→ Stopped)":
    "Detener nodo remoto (Stop remote node → detenido)",
  "Enter Pre-operational":
    "Pasar a preoperacional (Enter Pre-operational)",
  "Reset node":
    "Reiniciar nodo (Reset node)",
  "Reset communication":
    "Reiniciar comunicación (Reset communication)",
  "Boot-up":
    "Arranque (Boot-up)",
  "Stopped":
    "Detenido (Stopped)",
  "Operational":
    "Operacional (Operational)",
  "Pre-operational":
    "Preoperacional (Pre-operational)",
  "Toggle bit not alternated":
    "El bit de alternancia no cambió",
  "SDO protocol timed out":
    "Tiempo de espera del protocolo SDO agotado",
  "Client/server command specifier not valid or unknown":
    "Especificador de comando cliente/servidor no válido o desconocido",
  "Out of memory":
    "Memoria insuficiente",
  "Unsupported access to an object":
    "Acceso no admitido a un objeto",
  "Attempt to read a write only object":
    "Intento de leer un objeto de solo escritura",
  "Attempt to write a read only object":
    "Intento de escribir un objeto de solo lectura",
  "Object does not exist in the object dictionary":
    "El objeto no existe en el diccionario de objetos",
  "Object cannot be mapped to the PDO":
    "El objeto no se puede mapear en el PDO",
  "Number and length of objects would exceed PDO length":
    "El número y la longitud de los objetos superarían la longitud del PDO",
  "General parameter incompatibility":
    "Incompatibilidad general de parámetros",
  "General internal incompatibility in the device":
    "Incompatibilidad interna general en el dispositivo",
  "Access failed due to a hardware error":
    "Fallo de acceso por un error de hardware",
  "Data type does not match, length of service parameter does not match":
    "El tipo de datos no coincide: la longitud del parámetro de servicio no coincide",
  "Data type does not match, length too high":
    "El tipo de datos no coincide: longitud demasiado grande",
  "Data type does not match, length too low":
    "El tipo de datos no coincide: longitud demasiado pequeña",
  "Sub-index does not exist":
    "El subíndice no existe",
  "Invalid value for parameter":
    "Valor no válido para el parámetro",
  "Value of parameter written too high":
    "Valor escrito del parámetro demasiado alto",
  "Value of parameter written too low":
    "Valor escrito del parámetro demasiado bajo",
  "General error":
    "Error general",
  "Data cannot be transferred or stored to the application":
    "Los datos no se pueden transferir ni guardar en la aplicación",
  "Data cannot be transferred or stored because of local control":
    "Los datos no se pueden transferir ni guardar por el control local",
  "Data cannot be transferred or stored because of the present device state":
    "Los datos no se pueden transferir ni guardar por el estado actual del dispositivo",
  "J1939 engine speed":
    "Régimen del motor J1939",
  "J1939 request":
    "Petición J1939",
  "CANopen SDO read":
    "Lectura SDO de CANopen",
  "CANopen NMT, heartbeat":
    "NMT y latido de CANopen",
  "SDO abort":
    "Aborto SDO",
  "Raw bit stream":
    "Cadena de bits en bruto",
  "Standard 11-bit":
    "Estándar de 11 bits",
  "Extended 29-bit":
    "Extendido de 29 bits",
  "Remote (RTR)":
    "Remota (RTR)",
  "Data":
    "Datos",
  "Format":
    "Formato",
  "DLC → length":
    "DLC → longitud",
  "Bits given":
    "Bits introducidos",
  "Stuff bits":
    "Bits de relleno",
  "at":
    "posiciones",
  "Stuff error (six equal bits) at":
    "Error de relleno (seis bits iguales) en la posición",
  "CRC15 received / computed":
    "CRC15 recibido / calculado",
  "match":
    "coincide",
  "mismatch":
    "no coincide",
  "CRC delimiter · ACK · ACK delimiter":
    "Delimitador de CRC · ACK · delimitador de ACK",
  "EOF 1s":
    "EOF a 1",
  "ACK slot is 1 — no receiver acknowledged":
    "La ranura ACK está a 1: ningún receptor confirmó la trama",
  "J1939 candidate":
    "Posible J1939",
  "Priority":
    "Prioridad",
  "Source address (SA)":
    "Dirección de origen (SA)",
  "Destination (DA)":
    "Destino (DA)",
  "Global (255)":
    "Global (255)",
  "Not in this table":
    "No está en esta tabla",
  "Not available (0xFF)":
    "No disponible (0xFF)",
  "Error (0xFE)":
    "Error (0xFE)",
  "Data too short":
    "Datos demasiado cortos",
  "SPN values":
    "Valores de los SPN",
  "CANopen candidate":
    "Posible CANopen",
  "Function":
    "Función",
  "Node ID":
    "ID de nodo",
  "NMT command":
    "Comando NMT",
  "SDO response (server → client)":
    "Respuesta SDO (servidor → cliente)",
  "SDO request (client → server)":
    "Petición SDO (cliente → servidor)",
  "NMT error control (heartbeat, boot-up)":
    "Control de errores NMT (latido, arranque)",
  "Outside the predefined set (vendor or custom)":
    "Fuera del conjunto predefinido (del fabricante o propio)",
  "Command":
    "Comando",
  "Target node":
    "Nodo de destino",
  "State":
    "Estado",
  "Error code":
    "Código de error",
  "Error register (1001h)":
    "Registro de errores (1001h)",
  "Manufacturer field":
    "Campo del fabricante",
  "Initiate download (write)":
    "Iniciar descarga (escritura)",
  "Download (write) confirmed":
    "Descarga (escritura) confirmada",
  "Initiate upload (read request)":
    "Iniciar carga (petición de lectura)",
  "Upload (read) response":
    "Respuesta de carga (lectura)",
  "Download segment":
    "Segmento de descarga",
  "Download segment response":
    "Respuesta al segmento de descarga",
  "Upload segment request":
    "Petición de segmento de carga",
  "Upload segment":
    "Segmento de carga",
  "Abort":
    "Aborto",
  "Block transfer":
    "Transferencia por bloques",
  "Unknown command":
    "Comando desconocido",
  "Command byte":
    "Byte de comando",
  "Object":
    "Objeto",
  "Expedited, data":
    "Acelerada, datos",
  "Segmented, total size":
    "Segmentada, tamaño total",
  "Segment data":
    "Datos del segmento",
  "last":
    "último",
  "toggle":
    "alternancia",
  "Abort code":
    "Código de aborto",
  "PDO data can only be decoded with its mapping (1600h–, 1A00h–)":
    "Los datos de un PDO solo se pueden decodificar con su mapeo (1600h–, 1A00h–)",
  "Not enough bits":
    "Faltan bits",
  "No SOF (0)":
    "No hay SOF (0)",
  "Check the hex bytes":
    "Revise los bytes hex",
  "candump IDs are 3 digits (standard) or 8 (extended)":
    "Los ID de candump tienen 3 dígitos (estándar) u 8 (extendido)",
  "ID out of range":
    "ID fuera de rango",
  "Data too long":
    "Datos demasiado largos",
  "CAN FD lengths are 0–8, 12, 16, 20, 24, 32, 48, 64":
    "Las longitudes de CAN FD son 0–8, 12, 16, 20, 24, 32, 48, 64",
  "DLC must be 0–8":
    "El DLC debe estar entre 0 y 8",
  "DLC and data length differ":
    "El DLC y la longitud de los datos no coinciden",
  "Check the ID":
    "Revise el ID",
  "Cannot read this line":
    "No se puede leer esta línea",
  "requested {}":
    "se piden {0}",
  "Requested PGN":
    "PGN pedido",
  "CANopen decoding needs an 11-bit COB-ID.":
    "Para decodificar CANopen hace falta un COB-ID de 11 bits.",
  "function code":
    "código de función",
  "0 — all nodes":
    "0 — todos los nodos",
  " (toggle 1 — node guarding)":
    " (alternancia 1 — node guarding)",
  " — error reset / no error":
    " — borrado de error / sin error",
  "bytes":
    "bytes",
};
