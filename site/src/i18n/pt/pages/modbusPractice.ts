// Exercícios Modbus (views/ModbusPracticePage.astro) — 4º lote. rtu = trechos antes e depois do link para o conversor RTU↔TCP (o texto do link é inserido por weave())
export default {
  title: "Exercícios de Modbus (quiz)",
  seo: "Exercícios Modbus: quiz de quadros RTU, CRC e exceções — PortDock",
  desc: "Exercícios de Modbus RTU: HEX de uma requisição de leitura, valor de 40003 numa resposta, exceção 83 02, ordem dos bytes do CRC, float ABCD ou CDAB.",
  kind: "Tipo de questão",
  mixed: "Aleatório",
  check: "Conferir resposta",
  next: "Próxima questão",
  reset: "Zerar pontuação",
  answerLabel: "Resposta",
  how: "As questões são geradas e corrigidas no seu navegador. A pontuação fica só neste navegador e não é enviada.",
  faqTitle: "Como usar",
  faq: [
    ["Para quem é?", "Para técnicos novatos e estagiários que estão aprendendo Modbus RTU, ou para quem quer revisar antes de ir a campo. Depois de cada resposta aparecem uma explicação e links para o guia e a ferramenta web relacionados."],
    ["Posso passar a mesma questão para outra pessoa?", "Copie «Link para esta questão», abaixo da questão, e envie: abre a mesma questão. Cada questão é gerada a partir de um número (semente), então o mesmo número dá a mesma questão."],
    ["Como escrevo uma resposta dissertativa?", "No HEX não importam espaços, maiúsculas nem 0x (01 03 00 00 00 0A C5 CD é igual a 0103000000 0ac5cd). Os valores são em decimal; ponha 0x na frente para digitar em HEX."],
  ],
  srcTitle: "Referências",
  qlink: "Link para esta questão",
  guidesTitle: "Guias para ler junto",
  src: ["códigos de função, formato de requisições e respostas, códigos de exceção", "quadro RTU, CRC (byte baixo primeiro)", "float32. A ordem das words dos registradores (ABCD, CDAB) não está na especificação Modbus e varia conforme o equipamento"],
  rtu: ["Para converter quadros entre RTU, TCP e ASCII, use o ", "."],
};
