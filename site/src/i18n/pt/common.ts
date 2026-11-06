// Português (Brasil) — nomes e descrições curtas usados em várias páginas (programas, ferramentas web, grupos, «O que você quer fazer?», tamanhos de arquivo).
import type { Tool } from "../../data/tools";
import type { GroupId } from "../../data/webToolGroups";
import type { ScopePath } from "../scope";

/** Ferramentas web traduzidas (todas as tools/… de scope.ts) */
type ScopeTool = Exclude<ScopePath, "" | "tools/" | "download/" | "safety/" | "privacy/">;

export default {
  /** Descrição curta de cada programa (tagline em tools.ts) */
  apps: {
    serial: "Terminal serial (COM) com linhas de sinal e reconexão automática",
    "modbus-slave": "Simulador de escravo Modbus (RTU e TCP) com tabelas de registradores e injeção de falhas",
    tcp: "Cliente, servidor e relay TCP — várias conexões, eco e reconexão automática",
    udp: "Envio e recepção UDP — broadcast, multicast e eco",
    simulator: "Equipamento simulado que responde por regras — serial, TCP e UDP",
    netscan: "Encontre o IP de equipamentos em redes industriais — portas industriais e ping de longa duração",
    "modbus-master": "Mestre Modbus RTU/TCP (polling) — valores tipados, escrita e varredura de endereços de escravo",
    scpi: "Terminal SCPI para instrumentos — socket LAN e RS-232, sem VISA",
    plot: "Gráficos em tempo real dos números recebidos por serial, TCP e UDP",
    "port-inspector": "Inspeção somente leitura de portas COM, placas de rede, configurações do PC e rede sem fio",
    "plc-simulator": "Simulador de servidor do protocolo MC (SLMP) — teste IHM e softwares de coleta sem o CLP",
    "hw-tester": "Registro de quedas e latência de Wi-Fi e internet, com conexões Bluetooth e USB (a partir da 0.10.0)",
    mcp: "Servidor MCP para clientes de IA — lê portas, Modbus, MC e SCPI; escreve só nos simuladores deste PC",
  } satisfies Record<Tool["id"], string>,

  /** Nome e descrição curta das ferramentas web (name·blurb em webTools.ts) */
  webTools: {
    "tools/4-20ma/": { name: "Calculadora de escala 4–20 mA", blurb: "Corrente/tensão ↔ unidade de engenharia ↔ % ↔ valor digital do CLP (0–27648 etc.). Tabela de 4, 8, 12, 16 e 20 mA." },
    "tools/modbus/": { name: "Gerador de requisição Modbus RTU", blurb: "Endereço do escravo, função, endereço e quantidade → bytes da requisição com CRC. Aceita a notação 40001." },
    "tools/modbus-decoder/": { name: "Decodificador de quadros Modbus", blurb: "Cole os bytes RTU ou TCP e veja endereço do escravo, função, valores, CRC, MBAP e códigos de exceção." },
    "tools/modbus-float/": { name: "Conversor de float Modbus", blurb: "2 ou 4 registradores ↔ float32, float64 e int32. As ordens ABCD, CDAB, BADC e DCBA lado a lado." },
    "tools/mc-decoder/": { name: "Decodificador de quadros do protocolo MC (SLMP)", blurb: "Quadros 3E/4E binários ou ASCII → cabeçalho, comando, dispositivo, valores e código de término. Associa a resposta à requisição e monta requisições." },
    "tools/rs485/": { name: "Calculadora de terminação e polarização RS-485", blurb: "Pull-up/pull-down com terminação de 120/150 Ω → tensão diferencial em repouso frente ao limiar de 200 mV, potência dos resistores e comprimento × baud rate." },
    "tools/serial-timing/": { name: "Calculadora de tempos da comunicação serial", blurb: "Baud rate e paridade → tempo de caractere, t3.5/t1.5 do Modbus RTU, tempo de requisição e resposta, ciclo de polling e timeout mínimo." },
    "tools/checksum/": { name: "Calculadora de CRC e checksum", blurb: "CRC16 Modbus/CCITT/XMODEM, CRC8, LRC, BCC, SUM8 e SUM16 de uma só vez." },
    "tools/subnet/": { name: "Calculadora de sub-rede IP", blurb: "Endereço e máscara (/24) → rede, broadcast e faixa. Confere as duas máscaras: o PC e o CLP estão na mesma sub-rede?" },
    "tools/pinouts/": { name: "Pinagem de conectores", blurb: "DB9/DB25 RS-232, RJ45 T568A/B e Ethernet, Modbus RJ45/DB9 (especificação), M12 código A/D/X, M8, USB-A/B/C, bornes RS-485 — vistas frontais macho/fêmea, cores dos fios, fontes e SVG." },
  } satisfies Record<ScopeTool, { name: string; blurb: string }>,

  /** Grupos de ferramentas web (webToolGroups.ts) */
  groups: {
    comm: "Serial e Modbus",
    net: "Rede",
    draw: "Ligações e diagramas",
    diag: "Diagnóstico e verificação",
    field: "Ferramentas de campo",
    signal: "Sinais e sensores",
    elec: "Elétrica e motores",
    mech: "Mecânica e pneumática",
    units: "Conversão de unidades",
    hw: "Testes de hardware do PC",
    etc: "Outras ferramentas",
  } satisfies Record<GroupId, string>,

  /** «O que você quer fazer?» (components/PickApp.astro) — pelo id de cada caminho */
  pick: {
    title: "O que você quer fazer?",
    q: {
      serial: "Comunicar com um equipamento serial (COM) ou RS-485",
      modbus: "Ler e escrever em equipamentos Modbus, ou simular um",
      net: "Encontrar o IP de equipamentos na rede, comunicação TCP e UDP",
      sim: "Testar a IHM ou o software supervisório sem o CLP ou o equipamento",
      scpi: "Controlar um instrumento (SCPI) e registrar medições",
      pc: "Problemas de conexão no PC — porta COM, placa de rede, Wi-Fi, Bluetooth",
      mcp: "Ler equipamentos a partir de uma IA (MCP)",
    },
    hwTitle: "Testar microfone, teclado, mouse, webcam ou monitor",
    hwName: "Testes de hardware do PC",
    hwNote: (n: number) => `Não é um programa para Windows — roda no navegador, sem instalar (${n} testes)`,
  },

  /** Tamanho dos arquivos (SIZE em release.ts) */
  size: { setup: "cerca de 4 MB", offline: "cerca de 220 MB", portable: "cerca de 3 MB" },
};
