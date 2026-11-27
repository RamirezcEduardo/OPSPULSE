import { createClient } from "@/lib/supabase/server";
import { fmtFecha, fmtNum, fmtSoles } from "@/lib/formato";

export type Dash = {
  kpi: { valor: number; und: number; lpn: number; cd: number; prom: number | null; mesmax: string | null; curso: number; mescurso: string | null; hasta: string | null };
  mensual: { mes: string; area: string; v: number; u: number; l: number }[] | null; areas: { k: string; v: number; u: number; l: number; m: number }[] | null;
  familias: { k: string; v: number; u: number; l: number }[] | null; top: { k: string; d: string; fam: string; u: number; v: number; l: number; ult: string; area: string }[] | null;
  semanal: { k: string; v: number; u: number }[] | null; opciones: { areas: string[] | null; familias: string[] | null; meses: string[] | null; semanas: string[] | null };
};
export const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];
export const nomMes = (m: string) => `${m} ${MESES[Number(m.slice(5)) - 1] ?? ""}`;
export async function cargar(p: { area?: string; familia?: string; mes?: string; semana?: string }) {
  const s = await createClient();
  const { data, error } = await s.rpc("merma_dash", { p_area: p.area || null, p_familia: p.familia || null, p_mes: p.mes || null, p_semana: p.semana || null });
  return { d: data as Dash | null, error: error?.message };
}
const sel = "h-9 rounded-lg border border-borde bg-tarjeta px-2 text-sm text-texto";
export function Filtros({ d, sp, area }: { d: Dash; sp: Record<string, string | undefined>; area?: boolean }) {
  const ops: [string, string, string[]][] = [...(area ? [["area", "Área", (d.opciones.areas ?? []).filter(Boolean).sort()] as [string, string, string[]]] : []),
    ["familia", "Familia", (d.opciones.familias ?? []).filter(Boolean).sort()], ["mes", "Mes", (d.opciones.meses ?? []).sort()], ["semana", "Semana", (d.opciones.semanas ?? []).sort()]];
  return (
    <form className="flex flex-wrap items-end gap-2 rounded-xl bg-tarjeta p-3">
      {ops.map(([n, l, o]) => <label key={n} className="flex flex-col gap-1 text-xs text-suave">{l}<select name={n} defaultValue={sp[n] ?? (n === "area" ? "MEZZANINE" : "")} className={sel}>{n !== "area" && <option value="">Todos</option>}{o.map((x) => <option key={x}>{x}</option>)}</select></label>)}
      <button className="h-9 rounded-lg bg-marca px-4 text-sm font-semibold text-white">Ver</button>
    </form>);
}
export function Kpis({ items }: { items: [string, string, string?][] }) {
  return <section className="grid grid-cols-2 overflow-hidden rounded-xl bg-tarjeta sm:grid-cols-3 xl:grid-cols-6">{items.map(([t, v, c]) => (
    <div key={t} className="text-center"><p className="bg-grafito px-1 py-1 text-xs font-semibold text-white">{t}</p><p className={`px-1 py-3 text-lg font-bold tabular-nums sm:text-xl ${c ?? ""}`}>{v}</p></div>))}</section>;
}
export function TopProductos({ d, titulo, total, area }: { d: Dash; titulo: string; total: number; area?: boolean }) {
  let acum = 0;
  return (
    <section className="rounded-xl bg-tarjeta p-5"><h2 className="mb-3 font-semibold text-marca">{titulo}</h2>
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm">
        <thead className="bg-grafito text-left text-white"><tr>{["#", "Cod Alternat", "Producto", "Familia", "Unidades", "Merma S/", `% del ${area ? "área" : "total"}`, "% acumulado", "N° LPN", area ? "Última merma" : "Área con más merma"].map((h) => <th key={h} className="px-2 py-2 font-semibold">{h}</th>)}</tr></thead>
        <tbody>{(d.top ?? []).map((x, i) => { const p = total ? Number(x.v) / total : 0; acum += p; return (
          <tr key={x.k} className="border-b border-borde"><td className="px-2 py-1">{i + 1}</td><td className="px-2 py-1">{x.k}</td><td className="max-w-72 truncate px-2 py-1">{x.d}</td><td className="px-2 py-1">{x.fam}</td>
            <td className="px-2 py-1 text-right">{fmtNum(Number(x.u))}</td><td className="px-2 py-1 text-right font-semibold text-marca">{fmtSoles(Number(x.v))}</td><td className="px-2 py-1 text-right">{(p * 100).toFixed(1)}%</td><td className="px-2 py-1 text-right">{(acum * 100).toFixed(1)}%</td>
            <td className="px-2 py-1 text-right">{x.l}</td><td className="px-2 py-1">{area ? fmtFecha(x.ult + "T12:00:00-05:00") : x.area}</td></tr>); })}</tbody></table></div>
    </section>);
}
