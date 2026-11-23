// Tabla donde vive cada carga (por carga_id) y vistas para exportar el apartado completo
export const TABLA_CARGA: Record<string, { tabla: string; nombre: string }> = {
  AUDITORIA_ACTIVO: { tabla: "auditoria_activo", nombre: "Auditoría de reabasto" },
  PERDIDOS: { tabla: "bulto", nombre: "Perdidos / Sin ubicación" },
  SIN_UBICACION: { tabla: "bulto", nombre: "Sin ubicación" },
  SHORTPICK: { tabla: "shortpick_linea", nombre: "Shortpick" },
  ASN: { tabla: "asn_historial", nombre: "Recepción (ASN)" },
};
export const APARTADOS: { id: string; nombre: string; tabla: string; orden: string }[] = [
  { id: "reabasto", nombre: "Auditoría de reabasto", tabla: "auditoria_activo", orden: "id" },
  { id: "recepcion", nombre: "Recepción (ASN)", tabla: "v_asn", orden: "nro_asn" },
  { id: "perdidos", nombre: "Perdidos y sin ubicación", tabla: "v_bulto", orden: "id" },
  { id: "recuperaciones", nombre: "Recuperaciones de bultos", tabla: "bulto_recuperacion", orden: "id" },
  { id: "shortpick", nombre: "Shortpick", tabla: "v_shortpick", orden: "id" },
  { id: "5s", nombre: "Auditoría 5S", tabla: "auditoria_5s", orden: "id" },
  { id: "incidencias", nombre: "Incidencias", tabla: "incidencia", orden: "id" },
];
// Gestiones que un admin puede restablecer (volver a pendiente) o eliminar
export const GESTIONES = {
  reabasto: "Validación de activo (reabasto)",
  shortpick: "Verificación de shortpick",
  recuperacion: "Recuperación de bulto",
  asn: "Gestión de ASN",
  "5s": "Auditoría 5S",
  incidencia: "Incidencia",
} as const;
export type Gestion = keyof typeof GESTIONES;
