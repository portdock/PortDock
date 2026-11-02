// metricThreads — français (source : version anglaise de views/MetricThreadsPage.astro).
export default {
  h1: "Filetages métriques : forets de taraudage et tableau des vis",
  desc: "Pas et perçage avant taraudage (d − P) des filetages métriques M2–M20 gros et fins, avec tailles de clé six pans (ISO 4762) et de clé plate (ISO 4032).",
  seo: "Forets de taraudage métriques, clés six pans et plates — PortDock",
  find: "Rechercher un filetage",
  thread: "Filetage (p. ex. M8, M10x1.25)",
  bad: "Absent du tableau — saisissez M2, M2.5, M3, M4, M5, M6, M8, M10, M12, M14, M16, M18 ou M20 avec son pas gros ou fin.",
  k: { p: "Pas", kind: "Type", coarse: "Gros", fine: "Fin", drill: "Perçage avant taraudage ≈ d − P", key: "Clé six pans (vis à tête cylindrique ISO 4762)", sp: "Clé plate (écrou ISO 4032, vis ISO 4014/4017)", din: "DIN 934 (ancienne norme)" },
  rev: "Rechercher par taille d’outil",
  bySp: "Clé plate (mm)",
  byKey: "Clé six pans (mm)",
  tTitle: "Tableau des filetages métriques (M2–M20)",
  tHead: ["Filetage", "Pas gros", "Perçage avant taraudage", "Pas fin (perçage)", "Clé six pans", "Clé plate"],
  tNote:
    "Le perçage d − P est une approximation pour les tarauds à tailler. En pratique, prenez le foret le plus proche dont vous disposez et ajustez selon la matière et la profondeur de filetage. Les tarauds à refouler (par déformation) demandent un autre diamètre de foret — voir le tableau du fabricant du taraud. Les tailles de clé plate sont celles de l’ISO 4032 ; les anciens écrous DIN 934 font 17 mm pour M10, 19 mm pour M12 et 22 mm pour M14.",
  torqueTitle: "Couple de serrage",
  torque:
    "Le couple des vis dépend de la classe de qualité (8.8, A2-70, etc.), de la lubrification et du matériau en contact, et les borniers, disjoncteurs et contacteurs ont leur propre couple prescrit par le fabricant (imprimé sur la pièce ou dans la fiche technique). Ce tableau ne contient pas de valeurs de couple — vérifiez la valeur du fabricant et utilisez un tournevis dynamométrique.",
  privacy: "Cette page effectue ses recherches dans votre navigateur ; ce que vous saisissez n’est pas envoyé à un serveur.",
  srcTitle: "Sources",
  see: ["Pour les cosses à œil adaptées à une vis, voir le ", ". Pour la conversion entre pouces et mm, utilisez le ", "."],
  isoNut: "Écrous hexagonaux ordinaires (type 1)",
  dinNut: "ancienne norme d’écrous hexagonaux",
  faqTitle: "FAQ",
  faq: [
    ["Pourquoi le perçage avant taraudage est-il « d − P » ?", "C’est l’approximation habituelle pour les tarauds à tailler (diamètre nominal moins le pas). En pratique, prenez le foret le plus proche dont vous disposez et ajustez selon la matière et la profondeur de filetage. Les tarauds à refouler (par déformation) demandent un autre foret — voir le tableau du fabricant du taraud."],
    ["La taille de ma clé ne correspond pas au tableau", "Les anciens écrous DIN 934 ont des tailles de clé différentes de l’ISO 4032 pour M10, M12 et M14. Vérifiez la valeur « DIN 934 » dans le tableau."],
    ["Pourquoi n’y a-t-il pas de couple de serrage ?", "Il dépend de la classe de qualité de la vis, de la lubrification et du matériau en contact, et les borniers, disjoncteurs et contacteurs ont leur propre couple donné par le fabricant. Suivez le marquage du produit ou la fiche technique."],
  ] as [string, string][],
};
