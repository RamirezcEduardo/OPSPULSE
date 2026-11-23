import { fechaFlexible } from "./csv";

/** Igual que la hoja «Parámetros» de los archivos ERU mensuales. */
export const CONTEO = new Set([37, 38, 41, 42]);
export const AJUSTE = new Set([17, 19, 39, 40, 29, 52, 53]);
export const BOLSA = new Set([17, 19, 29, 52, 53]);
const SIN_NETEO = /CONTROLADO|SUPERVISADO/;
export const COLS_ERU = ["Historial de actividad", "Ubicacion", "Un Ajust", "Fe y Hr Crea", "UBI", "ubic_area", "sub_area"];

const semana = (dia: string) => {
  const d = new Date(dia + "T12:00:00Z"); const t = new Date(d); t.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const ini = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return "SEM" + String(Math.ceil(((+t - +ini) / 864e5 + 1) / 7)).padStart(2, "0");
};

export type ResumenEru = ReturnType<typeof resumirEru>;

export function resumirEru(filas: Record<string, string>[]) {
  const n = (v: string | undefined) => { const x = Number(String(v ?? "").replace(/,/g, "")); return Number.isFinite(x) ? x : 0; };
  const base = filas.map((r) => {
    const cod = Number((r["Historial de actividad"] ?? "").match(/^\d+/)?.[0] ?? NaN);
    const iso = fechaFlexible(r["Fe y Hr Crea"]);
    const grupo = CONTEO.has(cod) ? "CONTEO" : AJUSTE.has(cod) ? "AJUSTE" : "DESCARTAR";
    return { r, cod, iso, dia: iso?.slice(0, 10) ?? null, grupo, un: n(r["Un Ajust"]), ubic: (r["Ubicacion"] ?? "").trim(), sku: (r["Cod Alternat"] ?? "").trim(),
      ubi: r["UBI"]?.trim() || null, area: r["ubic_area"]?.trim() || null, sub: r["sub_area"]?.trim() || null };
  }).filter((x) => x.dia && x.grupo !== "DESCARTAR");

  // Mes del archivo = el más frecuente (los días de otros meses se ignoran, como en la hoja)
  const cuenta = new Map<string, number>();
  base.forEach((x) => cuenta.set(x.dia!.slice(0, 7), (cuenta.get(x.dia!.slice(0, 7)) ?? 0) + 1));
  const mes = [...cuenta].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  const del = base.filter((x) => x.dia!.startsWith(mes));

  // Neteo: suma de ajustes por día + ubicación + SKU
  const neto = new Map<string, number>();
  del.filter((x) => x.grupo === "AJUSTE").forEach((x) => { const k = `${x.dia}|${x.ubic}|${x.sku}`; neto.set(k, (neto.get(k) ?? 0) + x.un); });

  // Llaves (día + ubicación): error si algún ajuste queda con diferencia
  const llaves = new Map<string, { dia: string; ubi: string | null; area: string | null; sub: string | null; error: number }>();
  for (const x of del) {
    const sinNeteo = SIN_NETEO.test((x.area ?? "").toUpperCase());
    const err = x.grupo !== "AJUSTE" ? 0 : (sinNeteo ? x.un !== 0 : (neto.get(`${x.dia}|${x.ubic}|${x.sku}`) ?? 0) !== 0) ? 1 : 0;
    const k = `${x.dia}|${x.ubic}`;
    const l = llaves.get(k);
    if (!l) llaves.set(k, { dia: x.dia!, ubi: x.ubi, area: x.area, sub: x.sub, error: err });
    else if (err) l.error = 1;
  }
  const res = new Map<string, { mes: string; dia: string; semana: string; ubi: string | null; area: string | null; subarea: string | null; contadas: number; con_error: number }>();
  for (const l of llaves.values()) {
    const k = [l.dia, l.ubi, l.area, l.sub].join("|");
    const v = res.get(k) ?? { mes, dia: l.dia, semana: semana(l.dia), ubi: l.ubi, area: l.area, subarea: l.sub, contadas: 0, con_error: 0 };
    v.contadas++; v.con_error += l.error; res.set(k, v);
  }

  // Faltante / sobrante por producto (hoja «Productos mes»)
  const prod = new Map<string, { mes: string; dia: string; semana: string; ubi: string | null; area: string | null; cod_alternat: string | null; descripcion: string; faltante: number; sobrante: number }>();
  for (const x of del) {
    const desc = (x.r["Descripcion"] ?? "").trim();
    if (x.grupo !== "AJUSTE" || !desc || x.un === 0) continue;
    const k = [x.dia, x.ubi, x.area, desc].join("|");
    const v = prod.get(k) ?? { mes, dia: x.dia!, semana: semana(x.dia!), ubi: x.ubi, area: x.area, cod_alternat: x.sku || null, descripcion: desc, faltante: 0, sobrante: 0 };
    if (x.un < 0) v.faltante -= x.un; else v.sobrante += x.un;
    prod.set(k, v);
  }

  // Movimientos de bolsa (hoja «Bolsa mes»): códigos 17/19/29/52/53, sin «SHORT PICK ACTIVO»
  const vistos = new Set<string>();
  const ajustes = del.filter((x) => BOLSA.has(x.cod) && x.un !== 0 && (x.r["Cod Razon"] ?? "").trim().toUpperCase() !== "SHORT PICK ACTIVO").map((x) => ({
    fuente: "ERU", mes, cod_actividad: x.cod, historial: x.r["Historial de actividad"] || null, nro_grupo: x.r["Nro Grupo"] || null, cod_alternat: x.sku || null,
    ubicacion: x.ubic || null, a_ubicacion: x.r["A ubicación"] || null, fecha: x.iso!, usuario_creado: x.r["Usuario creado"] || null, usuario_modif: x.r["Usuario Modificac"] || null,
    pantalla: x.r["Nombre pantalla"] || null, cod_razon: x.r["Cod Razon"] || null, nro_tarea: x.r["Nro Tarea"] || null, nro_lpn: x.r["Nro LPN"] || null,
    un_orig: n(x.r["Un Orig"]), un_ajuste: x.un, ubi: x.ubi, area_archivo: x.area, subarea: x.sub, descripcion_archivo: x.r["Descripcion"] || null, valor_ref: x.r["Valor Ref 1"] || null,
  })).filter((a) => { const k = [a.nro_grupo, a.cod_alternat, a.fecha, a.un_ajuste, a.ubicacion, a.nro_lpn].join("|"); if (vistos.has(k)) return false; vistos.add(k); return true; });

  return { mes, filas: filas.length, resumen: [...res.values()], productos: [...prod.values()], ajustes };
}
