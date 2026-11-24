import { fechaFlexible } from "./csv";

export const COLS_SP_MES = ["Historial de actividad", "Cod Alternat", "Ubicacion", "Un Ajust", "Fe y Hr Crea"];

/** Archivo mensual de shortpick (hoja DATA): solo códigos 4 y 17 con ajuste ≠ 0, del mes más frecuente. */
export function resumirShortpickMes(filas: Record<string, string>[]) {
  const n = (v: string | undefined) => { const x = Number(String(v ?? "").replace(/,/g, "")); return Number.isFinite(x) ? x : 0; };
  const base = filas.map((r) => {
    const cod = Number(r["Código de actividad de historial"] || (r["Historial de actividad"] ?? "").match(/^\d+/)?.[0] || NaN);
    const iso = fechaFlexible(r["Fe y Hr Crea"]);
    return { r, cod, iso, un: n(r["Un Ajust"]) };
  }).filter((x) => x.iso && (x.cod === 4 || x.cod === 17) && x.un !== 0);
  const cuenta = new Map<string, number>();
  base.forEach((x) => cuenta.set(x.iso!.slice(0, 7), (cuenta.get(x.iso!.slice(0, 7)) ?? 0) + 1));
  const mes = [...cuenta].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  const movs = base.filter((x) => x.iso!.startsWith(mes)).map((x) => ({
    mes, fecha: x.iso!, cod_actividad: x.cod, cod_alternat: x.r["Cod Alternat"]?.trim() || null, descripcion: x.r["Descripcion"]?.trim() || null,
    ubicacion: x.r["Ubicacion"]?.trim() || null, nro_grupo: x.r["Nro Grupo"]?.trim() || null, nro_lpn: x.r["Nro LPN"]?.trim() || null,
    nro_orden: x.r["Nro Orden"]?.trim() || x.r["Valor Ref 1"]?.trim() || null, usuario: x.r["Usuario creado"]?.trim() || null,
    pantalla: x.r["Nombre pantalla"]?.trim() || null, un_orig: n(x.r["Un Orig"]), un_ajust: x.un,
  }));
  return { mes, filas: filas.length, movs };
}
