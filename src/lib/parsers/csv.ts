/** Parser CSV simple (separador ; o , con comillas). Devuelve objetos por encabezado. */
export function parseCSV(texto: string): Record<string, string>[] {
  const t = texto.replace(/^﻿/, "");
  const primera = t.slice(0, t.indexOf("\n") >>> 0 || t.length);
  const sep = (primera.match(/;/g)?.length ?? 0) >= (primera.match(/,/g)?.length ?? 0) ? ";" : ",";
  const filas: string[][] = [];
  let campo = "", fila: string[] = [], enComillas = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (enComillas) {
      if (c === '"' && t[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') enComillas = false;
      else campo += c;
    } else if (c === '"') enComillas = true;
    else if (c === sep) { fila.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      fila.push(campo); campo = "";
      if (fila.some((x) => x !== "")) filas.push(fila);
      fila = [];
    } else campo += c;
  }
  if (campo !== "" || fila.length) { fila.push(campo); if (fila.some((x) => x !== "")) filas.push(fila); }
  const [enc, ...resto] = filas;
  if (!enc) return [];
  const h = enc.map((x) => arreglarTexto(x.trim()));
  const limpio = (v: string) => { const t = v.trim(); const m = t.match(/^="?(.*?)"?$/); return t.startsWith("=") && m ? m[1] : t; };
  return resto.map((r) => Object.fromEntries(h.map((k, i) => [k, limpio(r[i] ?? "")])));
}

/** "13/11/2026 12:26" o "13/11/2026" (hora de Lima) → ISO con -05:00 */
export function fechaLima(v: string | undefined): string | null {
  if (!v) return null;
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return null;
  const [, d, mo, y, h = "0", mi = "0", s = "0"] = m;
  const p = (x: string) => x.padStart(2, "0");
  return `${y}-${p(mo)}-${p(d)}T${p(h)}:${p(mi)}:${p(s)}-05:00`;
}
export const num = (v: string | undefined) => (v == null || v === "" ? null : Number(v.replace(/,/g, "")));

/** Corrige mojibake típico (UTF-8 leído como Latin-1): "ubicaciÃ³n" → "ubicación". */
export function arreglarTexto(t: string) {
  if (!/[ÃÂ]/.test(t)) return t;
  try { return decodeURIComponent(escape(t)); } catch { return t; }
}

/** Fecha día/mes/año con hora opcional, o serial de Excel → ISO con -05:00 */
export function fechaFlexible(v: string | undefined): string | null {
  if (!v) return null;
  const n = Number(v);
  if (!Number.isNaN(n) && n > 30000 && n < 80000) {
    const ms = Math.round((n - 25569) * 86400000);
    const d = new Date(ms);
    const p = (x: number) => String(x).padStart(2, "0");
    return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}-05:00`;
  }
  return fechaLima(v.trim());
}
