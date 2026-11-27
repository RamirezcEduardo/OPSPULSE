import { fechaFlexible } from "./csv";

export const COLS_MERMA = ["lpn", "Cod Alternat", "Cantidad actual", "Área"];

/** Hoja DATA del EVOLUTIVO DE MERMA: solo se guardan las columnas que usa el dashboard. */
export function mapearMerma(filas: Record<string, string>[]) {
  const n = (v: string | undefined) => { const x = Number(String(v ?? "").replace(/,/g, "")); return Number.isFinite(x) ? x : 0; };
  const vistos = new Set<string>();
  return filas.map((r) => {
    const f = fechaFlexible(r["Fecha registro"]) ?? fechaFlexible(r["Fecha"]) ?? fechaFlexible(r["Fe y Hr Modif"]);
    return { fecha: f?.slice(0, 10) ?? "", lpn: (r["lpn"] ?? r["LPN"] ?? "").trim(), cod_alternat: (r["Cod Alternat"] ?? "").trim(), descripcion: r["CER"]?.trim() || r["Descripcion"]?.trim() || null,
      unidades: n(r["Cantidad actual"]), area: r["Área"]?.trim() || null, familia: r["Familia"]?.trim() || null, valor: n(r["Val tot"]), origen: r["Ubicación anterior"]?.trim() || null };
  }).filter((x) => { const k = `${x.lpn}|${x.cod_alternat}|${x.fecha}`; if (!x.fecha || !x.lpn || !x.cod_alternat || vistos.has(k)) return false; vistos.add(k); return true; });
}
