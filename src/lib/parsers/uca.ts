import { fechaFlexible } from "./csv";

const k = (r: Record<string, string>, ...n: string[]) => { for (const x of n) if (r[x] != null && r[x] !== "") return String(r[x]).trim(); return ""; };
const num = (v: string) => { const x = Number(String(v).replace(/,/g, "")); return Number.isFinite(x) ? x : 0; };

/** Maestro de posiciones de reserva (hoja BASE_POSICIONES). */
export function mapearPosiciones(filas: Record<string, string>[]) {
  return filas.map((r) => ({ ubicacion: k(r, "UBICACION", "Ubicacion").toUpperCase(), area: k(r, "AREA") || null, pasillo: k(r, "PASILLO") || null,
    bahia: num(k(r, "BAHIA")) || null, nivel: num(k(r, "NIVEL")) || null, altura: k(r, "ALTURA") || null, zona_tarea: k(r, "ZONA_TAREA") || null })).filter((x) => x.ubicacion);
}

/** Archivo del WMS (ReserveInventory): se resume por ubicación → unidades, LPN y SKUs. */
export function resumirStockWms(filas: Record<string, string>[]) {
  const m = new Map<string, { ubicacion: string; unidades: number; lpns: number; skus: Set<string>; ult: string | null }>();
  let corte = "";
  for (const r of filas) {
    const u = k(r, "Texto mostrado", "UBICACION", "Ubicacion").toUpperCase().replace(/-+$/, "");
    if (!u) continue;
    const f = fechaFlexible(k(r, "Fe y Hr Modif", "FECHA_MODIF"));
    if (f && f > corte) corte = f;
    const v = m.get(u) ?? { ubicacion: u, unidades: 0, lpns: 0, skus: new Set<string>(), ult: null };
    v.unidades += num(k(r, "Cantidad actual", "CANTIDAD")); v.lpns += num(k(r, "LPN actuales", "LPN"));
    const sku = k(r, "Cod Alternat", "COD_ALTERNO"); if (sku) v.skus.add(sku);
    if (f && (!v.ult || f > v.ult)) v.ult = f;
    m.set(u, v);
  }
  return { corte: corte || null, filas: filas.length, ubicaciones: [...m.values()].map((x) => ({ ubicacion: x.ubicacion, unidades: x.unidades, lpns: x.lpns, skus: x.skus.size, ult_modif: x.ult, corte: corte || null })) };
}
