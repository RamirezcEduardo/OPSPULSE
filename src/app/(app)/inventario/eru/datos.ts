import "server-only";
import { createClient } from "@/lib/supabase/server";

export type EriMes = { mes: string; skus: number; con_dif: number; bruto: number; neta: number; falt_s: number | null; sobr_s: number | null };
export const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];
export const nomMes = (m: string) => MESES[Number(m.slice(5)) - 1] ?? m;
export const fp = (x: number) => `${(x * 100).toFixed(1)}%`;
export const eriDe = (skus: number, dif: number) => (skus ? 1 - dif / skus : 0);

export async function eriMensual() {
  const s = await createClient();
  const { data } = await s.rpc("eri_mensual");
  return ((data ?? []) as EriMes[]).map((x) => ({ ...x, eri: eriDe(x.skus, x.con_dif) }));
}

/** ERU por mes agregado en la base (sin traer todas las filas). */
export async function eruMensual() {
  const s = await createClient();
  const filas: { mes: string; contadas: number; con_error: number; ubi: string | null }[] = [];
  for (let d = 0; ; d += 1000) {
    const { data } = await s.from("eru_resumen").select("mes,contadas,con_error,ubi").order("id").range(d, d + 999);
    filas.push(...(data ?? [])); if (!data || data.length < 1000) break;
  }
  const m = new Map<string, [number, number]>();
  filas.forEach((x) => { const v = m.get(x.mes) ?? [0, 0]; v[0] += x.contadas; v[1] += x.con_error; m.set(x.mes, v); });
  const tot = filas.reduce((a, x) => [a[0] + x.contadas, a[1] + x.con_error], [0, 0]);
  return { meses: [...m].sort((a, b) => a[0].localeCompare(b[0])).map(([mes, [c, e]]) => ({ mes, contadas: c, con_error: e, eru: c ? 1 - e / c : 0 })), contadas: tot[0], con_error: tot[1] };
}
