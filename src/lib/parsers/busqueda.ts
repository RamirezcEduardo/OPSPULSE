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
export function mapearBulto(r: Record<string, string>, clasificacion: "perdidos" | "sin_ubicacion") {
  const cat = pick(r, "Categoría", "Categoria", "Proceso").toUpperCase();
  const clas = /SIN.?UBIC/.test(cat) ? "sin_ubicacion" : /PERDID/.test(cat) ? "perdidos" : clasificacion;
  const valor = pick(r, "Valor S/", "Val tot", "Valor").replace(/[S/\s,]/g, "");
  return {
    clasificacion: clas,
    proceso: pick(r, "Proceso") || null,
    nro_lpn: pick(r, "Nro LPN", "lpn"),
    cod_alternat: pick(r, "Cod Alternat"),
    descripcion: arreglarTexto(pick(r, "Descripción", "Descripcion", "Producto")) || null,
    cantidad_actual: num(pick(r, "Cantidad perdida", "Unidades", "Cantidad actual")),
    val_tot: valor ? Number(valor) : null,
    fecha_creacion: fechaFlexible(pick(r, "Fecha creación LPN", "Fe y Hr Crea")),
    ubicacion: pick(r, "Ubicación de donde salió", "Ubicacion", "Ubicación") || null,
    area: pick(r, "Área", "Area") || null,
    supervisor: pick(r, "Supervisor a cargo", "Supervisor") || null,
    dni_causo: pick(r, "DNI usuario que lo CAUSÓ", "DNI causó") || null,
    usuario_causo: pick(r, "Nombre usuario que lo causó", "Usuario Modificac") || null,
    nro_grupo: pick(r, "Nro Grupo") || null,
  };
}
export type FilaBulto = ReturnType<typeof mapearBulto>;
