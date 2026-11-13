/**
 * Reglas de clasificación de la bolsa de inventario (brief, módulo 1).
 * Puras y sin dependencias para poder testearlas y reutilizarlas en el servidor.
 */

export type Fuente = "ERU" | "SHORTPICK" | "MANUAL";
export type Tipo = "CONTEO CICLICO" | "AJUSTE LPN";

export interface MovimientoBase {
  fuente: Fuente;
  codActividad?: number | null;
  ubicacion?: string | null;
  pantalla?: string | null;
  motivoOp?: string | null; // ya informado (MANUAL)
}

export interface Mapeos {
  /** ubicación virtual exacta (XX-SIN-UBIC-00…) → motivo op */
  ubicVirtual: Record<string, string>;
  /** pantalla del WMS → motivo op para cód. 29 */
  pantalla29: Record<string, string>;
}

export const MAPEOS_VACIOS: Mapeos = { ubicVirtual: {}, pantalla29: {} };

export const esUbicVirtual = (ubic?: string | null) => (ubic ?? "").trim().toUpperCase().startsWith("XX-");

export function clasificarTipo(m: MovimientoBase): Tipo | null {
  if (m.fuente === "SHORTPICK") return "CONTEO CICLICO";
  switch (m.codActividad) {
    case 19:
      return esUbicVirtual(m.ubicacion) ? "AJUSTE LPN" : "CONTEO CICLICO";
    case 17:
    case 53:
      return "CONTEO CICLICO";
    case 29:
    case 52:
      return "AJUSTE LPN";
    default:
      return null;
  }
}

export const SIN_MAPEO = "SIN MAPEO";

export function clasificarMotivo(m: MovimientoBase, mapeos: Mapeos = MAPEOS_VACIOS): string | null {
  if (m.fuente === "MANUAL") return m.motivoOp ?? null;
  if (m.fuente === "SHORTPICK") return "SHORTPICK";
  switch (m.codActividad) {
    case 19: {
      if (!esUbicVirtual(m.ubicacion)) return "AJUSTE ACTIVO";
      const u = (m.ubicacion ?? "").trim().toUpperCase();
      return mapeos.ubicVirtual[u] ?? SIN_MAPEO;
    }
    case 17:
      return "AJUSTE RESERVA LPN";
    case 53:
      return "AJUSTE RESERVA DETALLE LPN";
    case 52:
      return "VAS";
    case 29: {
      const p = (m.pantalla ?? "").trim().toUpperCase();
      return mapeos.pantalla29[p] ?? "CREACION LPN";
    }
    default:
      return null;
  }
}

/** Motivos que siempre van a NO CONSIDERAR */
export const MOTIVOS_EXCLUIDOS = ["AJUSTE SIEMBRA", "CREA LPN MULTISKU", "CREA LPN CARTONES"];

export interface NoConsiderar {
  nroGrupo: string;
  codAlternat: string | null; // null = todo el grupo
  motivo: string;
}

export function gestion(
  a: { nroGrupo?: string | null; codAlternat?: string | null; motivoOp?: string | null },
  exclusiones: NoConsiderar[],
): "CONSIDERAR" | "NO CONSIDERAR" {
  if (a.motivoOp && MOTIVOS_EXCLUIDOS.includes(a.motivoOp)) return "NO CONSIDERAR";
  const hit = exclusiones.some(
    (e) => e.nroGrupo === a.nroGrupo && (e.codAlternat == null || e.codAlternat === a.codAlternat),
  );
  return hit ? "NO CONSIDERAR" : "CONSIDERAR";
}

/** SHORTPICK solo entra con cód. actividad 4 y 17 */
export const shortpickAdmitido = (codActividad: number | null | undefined) =>
  codActividad === 4 || codActividad === 17;

export function areaDeUbicacion(
  ubicacion: string | null | undefined,
  areaPorUbic: Record<string, string>,
  areaVirtual: Record<string, string> = {},
): string {
  const u = (ubicacion ?? "").trim().toUpperCase();
  if (!u) return "LPN SIN UBICACION";
  if (esUbicVirtual(u)) return areaVirtual[u] ?? "VIRTUAL";
  return areaPorUbic[u] ?? "SIN AREA";
}
