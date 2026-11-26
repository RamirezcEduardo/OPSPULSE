/**
 * Estructura de ubicación del CD11: ÁREA-PASILLO-BAHÍA-NIVEL[-POSICIÓN]
 * Ej. MZ1-01-78-30 → área MZ1, pasillo 01, bahía 78, nivel 30.
 * En Mezzanine (MZ1/MZ2) el nivel es el PISO: 10 = piso 1, 20 = piso 2, 30 = piso 3…; en las demás áreas es el nivel del rack.
 */
export type Ubic = { area: string; pasillo: string; bahia: number | null; nivel: string | null; piso: number | null; posicion: string | null; esMezzanine: boolean; virtual: boolean };

export function parseUbicacion(u: string | null | undefined): Ubic | null {
  if (!u) return null;
  const t = u.trim().toUpperCase();
  const p = t.split("-");
  if (p.length < 3) return null;
  const virtual = /^(XX|SIN)/.test(t);
  return { area: p[0], pasillo: p[1], bahia: Number.isFinite(Number(p[2])) ? Number(p[2]) : null, nivel: p[3] ?? null, piso: /^MZ\d/.test(p[0]) && p[3] && Number.isFinite(Number(p[3])) ? Math.floor(Number(p[3]) / 10) : null, posicion: p[4] ?? null, esMezzanine: /^MZ\d/.test(p[0]), virtual };
}

/** Cercanía entre dos ubicaciones (para cruces): 3 misma bahía, 2 bahía vecina (±1), 1 mismo pasillo (±3 bahías), 0 lejos. */
export function cercania(a: string | null | undefined, b: string | null | undefined): number {
  const x = parseUbicacion(a), y = parseUbicacion(b);
  if (!x || !y || x.virtual || y.virtual || x.area !== y.area || x.pasillo !== y.pasillo || x.bahia == null || y.bahia == null) return 0;
  const d = Math.abs(x.bahia - y.bahia);
  return d === 0 ? 3 : d === 1 ? 2 : d <= 3 ? 1 : 0;
}
