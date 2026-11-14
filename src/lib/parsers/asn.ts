import { fechaLima, num } from "./csv";

export const COLUMNAS_ASN_REQUERIDAS = [
  "Nro ASN", "Estado", "Tipo ASN", "LPN enviadas originales", "Recuento de LPN recibidas",
  "Unidades enviadas originales", "Cantidad recibida", "Fe y Hr Crea",
];

const PRINCIPALES = new Set([
  ...COLUMNAS_ASN_REQUERIDAS, "Código de instalación", "Código de compañía", "Número de Guía", "Porcentaje de recepción",
  "Nro Carga", "Nro LPN", "Número de artículos", "Un Env", "Nombre de proveedor", "Nro de Cita", "Números de OC",
  "Fecha de envío", "Registro de hora de recepción de primera LPN", "Registro de hora de recepción de última LPN",
  "Fe y Hr Modif", "Hora de verificación", "Usuario Modificac", "Placa camión (*)", "Información de proveedor",
]);

export function faltanColumnas(encabezados: string[]) {
  return COLUMNAS_ASN_REQUERIDAS.filter((c) => !encabezados.includes(c));
}

export function mapearASN(r: Record<string, string>) {
  const extra = Object.fromEntries(Object.entries(r).filter(([k, v]) => !PRINCIPALES.has(k) && v && v !== "0"));
  const fe = fechaLima(r["Fecha de envío"]);
  return {
    nro_asn: r["Nro ASN"],
    estado: r["Estado"],
    tipo_asn: r["Tipo ASN"] || null,
    proveedor: r["Nombre de proveedor"] || r["Información de proveedor"] || null,
    nro_carga: r["Nro Carga"] || null,
    nro_cita: r["Nro de Cita"] || null,
    placa: r["Placa camión (*)"] || null,
    numero_guia: r["Número de Guía"] || null,
    ordenes_compra: r["Números de OC"] || null,
    lpn_enviadas: num(r["LPN enviadas originales"]),
    lpn_recibidas: num(r["Recuento de LPN recibidas"]),
    un_enviadas: num(r["Unidades enviadas originales"]),
    un_recibidas: num(r["Cantidad recibida"]),
    pct_recepcion: num(r["Porcentaje de recepción"]),
    nro_articulos: num(r["Número de artículos"]),
    fecha_creacion: fechaLima(r["Fe y Hr Crea"]),
    fecha_envio: fe ? fe.slice(0, 10) : null,
    primera_lpn_en: fechaLima(r["Registro de hora de recepción de primera LPN"]),
    ultima_lpn_en: fechaLima(r["Registro de hora de recepción de última LPN"]),
    verificado_en: fechaLima(r["Hora de verificación"]),
    usuario_modif: r["Usuario Modificac"] || null,
    extra: Object.keys(extra).length ? extra : null,
  };
}
export type FilaASN = ReturnType<typeof mapearASN>;
