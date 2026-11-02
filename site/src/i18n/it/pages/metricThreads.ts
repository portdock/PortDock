// Tabella delle filettature metriche: foro per maschio e viti (views/MetricThreadsPage.astro) — 7º lotto. Termini: filettatura metrica, passo grosso/fine, foro per maschiatura, chiave a brugola, chiave fissa
// see = frammenti tra i link
export default {
  h1: "Tabella delle filettature metriche: foro per maschio e viti",
  desc: "Passo e foro per maschio (d − P) delle filettature metriche M2–M20, grosse e fini, più chiave a brugola (ISO 4762) e fissa (ISO 4032). Per filetto o utensile.",
  seo: "Fori per maschiatura metrici, chiavi a brugola e fisse — PortDock",
  find: "Cerca una filettatura",
  thread: "Filettatura (ad es. M8, M10x1.25)",
  bad: "Non è nella tabella — inserite M2, M2.5, M3, M4, M5, M6, M8, M10, M12, M14, M16, M18 o M20 con il suo passo grosso o fine.",
  k: { p: "Passo", kind: "Tipo", coarse: "Grosso", fine: "Fine", drill: "Foro per maschio ≈ d − P", key: "Chiave a brugola (vite a testa cilindrica ISO 4762)", sp: "Chiave fissa (dado ISO 4032, vite ISO 4014/4017)", din: "DIN 934 (norma vecchia)" },
  rev: "Cerca dalla misura dell'utensile",
  bySp: "Chiave fissa (mm)",
  byKey: "Chiave a brugola (mm)",
  tTitle: "Tabella delle filettature metriche (M2–M20)",
  tHead: ["Filettatura", "Passo grosso", "Foro per maschio", "Passo fine (foro per maschio)", "Chiave a brugola", "Chiave fissa"],
  tNote:
    "Il foro per maschio d − P è un'approssimazione per i maschi a taglio. In pratica usate la punta più vicina che avete e regolate in base al materiale e alla profondità del filetto. I maschi a rullare (a deformazione) richiedono un'altra misura di foro — vedete la tabella del costruttore del maschio. Le misure delle chiavi fisse sono quelle della ISO 4032; i vecchi dadi DIN 934 sono da 17 mm per M10, 19 mm per M12 e 22 mm per M14.",
  torqueTitle: "Coppia di serraggio",
  torque:
    "La coppia di una vite dipende dalla classe di resistenza (8.8, A2-70 e così via), dalla lubrificazione e dal materiale di accoppiamento, e morsettiere, interruttori e contattori hanno una propria coppia indicata dal costruttore (stampata sul componente o nella scheda tecnica). Questa tabella non ha valori di coppia — controllate il valore del costruttore e usate un cacciavite dinamometrico.",
  privacy: "Questa pagina consulta i dati all'interno del vostro browser; ciò che inserite non viene inviato a un server.",
  srcTitle: "Fonti",
  see: ["Per i capicorda ad anello adatti a un perno vedete la ", ". Per la conversione tra pollici e mm usate il ", "."],
  isoNut: "Dadi esagonali normali (tipo 1)",
  dinNut: "vecchia norma dei dadi esagonali",
  faqTitle: "Domande frequenti",
  faq: [
    ["Perché il foro per maschio è «d − P»?", "È l'approssimazione abituale per i maschi a taglio (diametro nominale meno passo). In pratica usate la punta più vicina che avete e regolate in base al materiale e alla profondità del filetto. I maschi a rullare (a deformazione) richiedono un'altra punta — vedete la tabella del costruttore del maschio."],
    ["La misura della mia chiave fissa non corrisponde alla tabella", "I vecchi dadi DIN 934 usano misure di chiave diverse da quelle della ISO 4032 per M10, M12 e M14. Controllate il valore «DIN 934» della tabella."],
    ["Perché non c'è la coppia di serraggio?", "Dipende dalla classe di resistenza della vite, dalla lubrificazione e dal materiale di accoppiamento, e morsettiere, interruttori e contattori hanno una propria coppia del costruttore. Seguite la marcatura del prodotto o la scheda tecnica."],
  ] as [string, string][],
};
