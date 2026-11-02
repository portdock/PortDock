// metricThreads — Deutsch (Quelle: englische Fassung von views/MetricThreadsPage.astro).
export default {
  h1: "Metrische Gewinde: Kernlochbohrer- und Schraubentabelle",
  desc: "Steigung und Kernloch (d − P) für metrische Regel- und Feingewinde M2–M20 sowie Größen von Innensechskant (ISO 4762) und Schraubenschlüssel (ISO 4032).",
  seo: "Metrische Kernlochbohrer, Sechskant- & Schlüsselweiten — PortDock",
  find: "Ein Gewinde nachschlagen",
  thread: "Gewinde (z. B. M8, M10x1.25)",
  bad: "Nicht in der Tabelle — M2, M2.5, M3, M4, M5, M6, M8, M10, M12, M14, M16, M18 oder M20 mit Regel- oder Feinsteigung eingeben.",
  k: { p: "Steigung", kind: "Art", coarse: "Regelgewinde", fine: "Feingewinde", drill: "Kernloch ≈ d − P", key: "Innensechskantschlüssel (Zylinderschraube ISO 4762)", sp: "Schraubenschlüssel (Mutter ISO 4032, Schraube ISO 4014/4017)", din: "DIN 934 (alte Norm)" },
  rev: "Nach Werkzeuggröße suchen",
  bySp: "Schraubenschlüssel (mm)",
  byKey: "Innensechskantschlüssel (mm)",
  tTitle: "Tabelle metrischer Gewinde (M2–M20)",
  tHead: ["Gewinde", "Regelsteigung", "Kernloch", "Feinsteigung (Kernloch)", "Innensechskant", "Schlüsselweite"],
  tNote:
    "Das Kernloch d − P ist eine Näherung für Schneidbohrer. In der Praxis den nächstliegenden vorhandenen Bohrer nehmen und nach Werkstoff und Gewindetiefe anpassen. Furchende (Rolltaps) Gewindebohrer brauchen eine andere Bohrergröße — siehe die Tabelle des Herstellers. Die Schlüsselweiten sind nach ISO 4032; alte DIN-934-Muttern haben bei M10 17 mm, bei M12 19 mm und bei M14 22 mm.",
  torqueTitle: "Anzugsdrehmoment",
  torque:
    "Das Anzugsdrehmoment von Schrauben hängt von der Festigkeitsklasse (8.8, A2-70 usw.), der Schmierung und dem Gegenwerkstoff ab, und Reihenklemmen, Schutzschalter und Schütze haben ihr eigenes, vom Hersteller vorgegebenes Drehmoment (auf dem Bauteil oder im Datenblatt aufgedruckt). Diese Tabelle enthält keine Drehmomentwerte — den Wert des Herstellers prüfen und einen Drehmomentschraubendreher verwenden.",
  privacy: "Diese Seite schlägt in Ihrem Browser nach; Ihre Eingaben werden nicht an einen Server gesendet.",
  srcTitle: "Quellen",
  see: ["Für Ringkabelschuhe, die auf einen Bolzen passen, siehe die ", ". Zum Umrechnen zwischen Zoll und mm den ", "."],
  isoNut: "Sechskantmuttern, Regelausführung (Typ 1)",
  dinNut: "frühere Norm für Sechskantmuttern",
  faqTitle: "FAQ",
  faq: [
    ["Warum ist das Kernloch «d − P»?", "Das ist die übliche Näherung für Schneidbohrer (Nenndurchmesser minus Steigung). In der Praxis den nächstliegenden vorhandenen Bohrer nehmen und nach Werkstoff und Gewindetiefe anpassen. Furchende (Rolltaps) Gewindebohrer brauchen einen anderen Bohrer — siehe die Tabelle des Herstellers."],
    ["Meine Schlüsselweite stimmt nicht mit der Tabelle überein", "Alte DIN-934-Muttern haben bei M10, M12 und M14 andere Schlüsselweiten als ISO 4032. Den Wert «DIN 934» in der Tabelle prüfen."],
    ["Warum gibt es kein Anzugsdrehmoment?", "Es hängt von der Festigkeitsklasse der Schraube, der Schmierung und dem Gegenwerkstoff ab, und Reihenklemmen, Schutzschalter und Schütze haben ihr eigenes Drehmoment vom Hersteller. Der Kennzeichnung des Produkts oder dem Datenblatt folgen."],
  ] as [string, string][],
};
