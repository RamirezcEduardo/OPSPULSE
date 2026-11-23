/** Unifica cómo se escribe el área (KANAAP, KANAPP 1, MEZAMINE 1… → nombre oficial). */
export function normArea(a: string | null | undefined): string | null {
  if (!a) return null;
  let s = a.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
  s = s.replace(/^K\s*A?\s*N+\s*A+\s*P+\b/, "KNAPP").replace(/^KNAP+\b/, "KNAPP");
  s = s.replace(/^ME[SZ]+A?[NM]+[IE]+N?E?\b/, "MEZZANINE").replace(/^MZ\s*(\d)$/, "MEZZANINE $1");
  s = s.replace(/^ESTANTER[IÍ]A?S?\b/, "ESTANTERIA");
  s = s.replace(/^(KNAPP|MEZZANINE|ESTANTERIA)\s*-?\s*(\d)$/, "$1 $2");
  return s || null;
}
