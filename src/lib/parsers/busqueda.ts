import { arreglarTexto, fechaFlexible, num } from "./csv";

const pick = (r: Record<string, string>, ...ks: string[]) => { for (const k of ks) if (r[k] != null && r[k] !== "") return r[k]; return ""; };
const esSci = (v: string) => /^-?\d+(\.\d+)?E[+-]?\d+$/i.test(v);

export const COLS_SHORTPICK = ["Cod Alternat", "Ubicacion", "Un Ajust", "Fe y Hr Crea"];
export function mapearShortpick(r: Record<string, string>) {
  const cod = pick(r, "Cod Alternat");
  return {
    fecha: fechaFlexible(pick(r, "Fe y Hr Crea", "Fe y Hr Modif")),
    cod_alternat: cod,
    descripcion: arreglarTexto(pick(r, "Descripcion")) || null,
    ubicacion: pick(r, "Ubicacion"),
    un_ajust: num(pick(r, "Un Ajust")) ?? 0,
    un_orig: num(pick(r, "Un Orig")),
    nro_grupo: pick(r, "Nro Grupo") || null,
    cod_actividad: num(pick(r, "Código de actividad de historial", "Código")),
    usuario: pick(r, "Usuario creado") || null,
    estado_wms: pick(r, "Estado") || null,
    _sci: esSci(cod),
  };
}
export type FilaShortpick = ReturnType<typeof mapearShortpick>;

export const COLS_BULTO = ["Nro LPN"];

/** Proceso del archivo DATA → sección: "Sin Ubicación" → sin_ubicacion; cualquier otro proceso → perdidos. */
export function clasificar(proceso: string, porDefecto: "perdidos" | "sin_ubicacion") {
  const t = proceso.trim().toUpperCase();
  if (!t) return porDefecto;
  return /^SIN.?UBICACI[OÓ]N/.test(t) ? ("sin_ubicacion" as const) : ("perdidos" as const);
}

/** "SEM 46" + año → "2026-S46" (mismo formato que el resto de la app). */
export function semanaDe(sem: string, anio: string, fechaIso: string | null) {
  const n = sem.match(/(\d{1,2})/)?.[1];
  const y = anio.match(/\d{4}/)?.[0] ?? fechaIso?.slice(0, 4);
  return n && y ? `${y}-S${n.padStart(2, "0")}` : null;
}

export function mapearBulto(r: Record<string, string>, porDefecto: "perdidos" | "sin_ubicacion") {
  const proceso = pick(r, "Proceso", "Categoría", "Categoria");
  const ubic = pick(r, "Ubicacion", "Ubicación de donde salió", "Ubicación");
  const valor = pick(r, "Val tot", "Valor S/", "Valor").replace(/[S/\s,]/g, "");
  return {
    clasificacion: proceso ? clasificar(proceso, porDefecto) : /^SIN-?UBIC/i.test(ubic) ? ("sin_ubicacion" as const) : porDefecto,
    proceso: proceso || (/^SIN-?UBIC/i.test(ubic) ? "Sin Ubicación (WMS)" : null),
    nro_lpn: pick(r, "Nro LPN", "lpn"),
    cod_alternat: pick(r, "Cod Alternat"),
    descripcion: arreglarTexto(pick(r, "Descripcion", "Descripción")) || null,
    cantidad_actual: num(pick(r, "Cantidad actual", "Cantidad perdida", "Unidades")),
    val_tot: valor && !Number.isNaN(Number(valor)) ? Number(valor) : null,
    fecha_creacion: fechaFlexible(pick(r, "Fe y Hr Crea", "Fecha creación LPN", "Fecha")),
    ubicacion: ubic || null,
    ubicacion_anterior: pick(r, "Ubicación Anterior", "Ubicación anterior", "Ubicacion Anterior") || null,
    area: pick(r, "Área", "Area") || null,
    supervisor: pick(r, "Supervisor", "Supervisor a cargo") || null,
    responsable: pick(r, "Responsable") || null,
    familia: pick(r, "Familia", "CATEGORIA") || null,
    estado_wms: pick(r, "Estado") || null,
    usuario_causo: pick(r, "Usuario Modificac", "Nombre usuario que lo causó") || null,
    usuario_recepcion: pick(r, "Usuario de recepción", "Usuario de recepcion") || null,
    dni_causo: pick(r, "DNI usuario que lo CAUSÓ", "DNI causó") || null,
    nro_oc: pick(r, "Nro OC") || null,
    lote: pick(r, "Nro de lote") || null,
    nro_grupo: pick(r, "Nro Grupo") || null,
    semana: semanaDe(pick(r, "Sem", "Semana"), pick(r, "Año", "Anio"), fechaFlexible(pick(r, "Fe y Hr Crea", "Fecha"))),
  };
}
export type FilaBulto = ReturnType<typeof mapearBulto>;
