import { fechaLima, num } from "./csv";

export const COLUMNAS_REABASTO = ["Nro Tarea", "Cod Alternat", "Ubic destino", "Estado de tarea", "Tipo Asignac", "Cantidad asignada", "Fe y Hr Crea"];
export const faltanColumnasReabasto = (h: string[]) => COLUMNAS_REABASTO.filter((c) => !h.includes(c));

/** Turno por hora de Lima: Mañana 7–15, Tarde 15–23, Noche resto. */
export function turnoDe(iso: string | null) {
  if (!iso) return null;
  const h = Number(iso.slice(11, 13));
  return h >= 7 && h < 15 ? "Mañana" : h >= 15 && h < 23 ? "Tarde" : "Noche";
}

export function mapearReabasto(r: Record<string, string>) {
  const lpn = r["Nro LPN Entrada"] || r["Nro LPN"] || "";
  const destino = r["Ubic destino"] || "";
  const fecha = fechaLima(r["Fe y Hr Crea"]);
  return {
    clave: [r["Nro Tarea"], lpn, r["Cod Alternat"], destino].join("|"),
    fecha,
    turno: turnoDe(fecha),
    nro_tarea: r["Nro Tarea"] || null,
    nro_orden: r["Nro Orden"] || null,
    tipo_asignac: r["Tipo Asignac"] || null,
    estado: r["Estado de tarea"] || null,
    estado_asignacion: r["Estado"] || null,
    cod_alternat: r["Cod Alternat"] || null,
    descripcion: r["Descripcion"] || null,
    cantidad: num(r["Cantidad asignada"]),
    nro_lpn: lpn || null,
    lote: r["Nro de lote"] || null,
    fecha_prioritaria: r["Fecha prioritaria"] || null,
    ubic_destino: destino || null,
    area: destino ? destino.split("-")[0] : null,
    ubic_origen: r["De ubicación"] || r["Ubicación de paleta"] || null,
    ubic_activo: r["Ubicación activo"] || null,
    nro_carton: r["Num Carton"] || null,
    tipo_lpn: r["Tipo de LPN"] || null,
    usuario: r["Usuario Modificac"] || r["Usua Pick"] || null,
    usuario_pick: r["Usua Pick"] || null,
    usuario_creado: r["Usuario creado"] || null,
    fecha_modif: fechaLima(r["Fe y Hr Modif"]),
  };
}
export type FilaReabasto = ReturnType<typeof mapearReabasto>;

export interface ParamMuestra { aleatorias: number; consol_max: number; max_por_usuario: number; incluir_canceladas: boolean }

/** Muestra diaria: canceladas + hasta N REAB-CONSOL-CAJA + aleatorias estratificadas por área (máx. por usuario). */
export function seleccionarMuestra(tareas: FilaReabasto[], p: ParamMuestra, azar: () => number = Math.random) {
  const cerradas = tareas.filter((t) => /^final|^cancel/i.test(t.estado ?? ""));
  const elegidas = new Map<string, string>();
  if (p.incluir_canceladas) cerradas.filter((t) => /^cancel/i.test(t.estado ?? "")).forEach((t) => elegidas.set(t.clave, "CANCELADA"));
  const mezclar = <T,>(xs: T[]) => xs.map((x) => [azar(), x] as const).sort((a, b) => a[0] - b[0]).map(([, x]) => x);
  mezclar(cerradas.filter((t) => t.tipo_asignac === "REAB-CONSOL-CAJA" && !elegidas.has(t.clave)))
    .slice(0, p.consol_max).forEach((t) => elegidas.set(t.clave, "CONSOLIDACIÓN"));
  const resto = cerradas.filter((t) => /^final/i.test(t.estado ?? "") && !elegidas.has(t.clave));
  const porArea = new Map<string, FilaReabasto[]>();
  resto.forEach((t) => porArea.set(t.area ?? "?", [...(porArea.get(t.area ?? "?") ?? []), t]));
  const cupo = new Map<string, number>();
  const porUsuario = new Map<string, number>();
  const areas = [...porArea.keys()];
  areas.forEach((a) => cupo.set(a, Math.max(1, Math.round((p.aleatorias * porArea.get(a)!.length) / Math.max(1, resto.length)))));
  let total = 0;
  for (const a of areas) {
    for (const t of mezclar(porArea.get(a)!)) {
      if (total >= p.aleatorias || (cupo.get(a) ?? 0) <= 0) break;
      const u = t.usuario ?? "?";
      if ((porUsuario.get(u) ?? 0) >= p.max_por_usuario) continue;
      elegidas.set(t.clave, "ALEATORIA");
      porUsuario.set(u, (porUsuario.get(u) ?? 0) + 1);
      cupo.set(a, (cupo.get(a) ?? 0) - 1);
      total++;
    }
  }
  return elegidas;
}
