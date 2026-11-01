// Modbus 연습장(views/ModbusPracticePage.astro) — 4차 묶음. rtu 는 RTU↔TCP 변환기 링크의 앞·뒤 조각(링크 글은 weave() 가 끼운다)
export default {
  title: "Exercices Modbus (quiz)",
  seo: "Exercices Modbus : quiz trames RTU, CRC, exceptions — PortDock",
  desc: "Exercices Modbus RTU : HEX d’une requête de lecture, valeur de 40003 dans une réponse, exception 83 02, ordre du CRC, float ABCD ou CDAB. Avec explications.",
  kind: "Type de question",
  mixed: "Mélangé",
  check: "Vérifier",
  next: "Question suivante",
  reset: "Remettre le score à zéro",
  answerLabel: "Réponse",
  how: "Les questions sont créées et corrigées dans votre navigateur. Le score reste dans ce navigateur et n’est envoyé nulle part.",
  faqTitle: "Mode d’emploi",
  faq: [
    ["À qui s’adresse-t-il ?", "Aux techniciens débutants et aux stagiaires qui apprennent Modbus RTU, ou à toute personne qui veut se rafraîchir la mémoire avant une intervention. Après chaque réponse, une explication s’affiche avec des liens vers le guide et l’outil web correspondants."],
    ["Puis-je donner la même question à quelqu’un d’autre ?", "Copiez « Lien vers cette question » sous la question et envoyez-le : il ouvre la même question. Chaque question est construite à partir d’un nombre (une graine) ; le même nombre donne la même question."],
    ["Comment saisir une réponse écrite ?", "En HEX, les espaces, la casse et 0x sont ignorés (01 03 00 00 00 0A C5 CD équivaut à 0103000000 0ac5cd). Les valeurs sont en décimal ; préfixez 0x pour saisir de l’hexa."],
  ],
  srcTitle: "Références",
  qlink: "Lien vers cette question",
  guidesTitle: "Guides à lire en parallèle",
  src: ["codes fonction, forme des requêtes et réponses, codes d’exception", "trame RTU, CRC (octet de poids faible en premier)", "float32. L’ordre des mots dans les registres (ABCD, CDAB) ne figure pas dans la spécification Modbus et varie selon l’appareil"],
  rtu: ["Pour convertir des trames entre RTU, TCP et ASCII, utilisez le ", "."],
};
