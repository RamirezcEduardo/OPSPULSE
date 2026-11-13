export interface AjusteValorizable {
  fuente: "ERU" | "SHORTPICK" | "MANUAL";
  unAjuste: number;
  costoUnitario: number | null | undefined;
  montoManual?: number | null;
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Valor = un_ajuste × costo_unitario; MANUAL usa su monto. Sin costo → 0 y sin_costo = true */
export function valorizar(a: AjusteValorizable): { valor: number; sinCosto: boolean } {
  if (a.fuente === "MANUAL") return { valor: r2(a.montoManual ?? 0), sinCosto: false };
  if (a.costoUnitario == null) return { valor: 0, sinCosto: true };
  return { valor: r2(a.unAjuste * a.costoUnitario), sinCosto: false };
}

export interface Resumen {
  faltante: number;
  sobrante: number;
  neto: number;
  movimientos: number;
}

export function resumir(valores: number[]): Resumen {
  let faltante = 0;
  let sobrante = 0;
  for (const v of valores) (v < 0 ? (faltante += v) : (sobrante += v));
  return { faltante: r2(faltante), sobrante: r2(sobrante), neto: r2(faltante + sobrante), movimientos: valores.length };
}

/** Cierres trimestrales oficiales (brief). El neto del trimestre debe cuadrar con estos montos. */
export const CIERRES_OFICIALES: Record<string, number> = {
  Q1: -17853.57,
  Q2: -37423.59,
  Q3: -26235.46,
};

/** Monto del ajuste manual "DIFERENCIA VALORIZACION" necesario para cuadrar un trimestre. */
export const diferenciaValorizacion = (trimestre: string, netoCalculado: number) =>
  r2((CIERRES_OFICIALES[trimestre] ?? netoCalculado) - netoCalculado);
