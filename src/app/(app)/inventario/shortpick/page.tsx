import { createClient } from "@/lib/supabase/server";
import { obtenerPermisos } from "@/lib/permisos";
import { fmtNum, fmtSoles } from "@/lib/formato";
import { Barras, Kpis } from "@/components/Graficos";
import { Combo } from "@/components/Lineas";
import { CargarShortpick } from "./Cargar";

export const dynamic = "force-dynamic";
type P = { k: string; d?: string; lineas: number; un?: number; valor: number | null; skus?: number };
type R = { kpi: { lineas: number; unidades: number; valor: number; skus: number; grupos: number }; mensual: P[] | null; semanal: P[] | null; diario: P[] | null; zonas: P[] | null; skus: P[] | null; meses: string[] | null };
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];

export default async function Shortpick({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const sp = await searchParams;
  const s = await createClient();
  const { nivel } = await obtenerPermisos();
  const { data, error } = await s.rpc("shortpick_resumen", { p_mes: sp.mes || null });
  const d = data as R | null;
  const S = (v: number | null | undefined) => fmtSoles(Number(v ?? 0));
  const combo = (xs: P[] | null, etq: (k: string) => string) => (xs ?? []).map((x) => ({ x: etq(x.k), falt: Number(x.valor ?? 0), sob: 0, neto: Number(x.valor ?? 0) }));
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm text-suave">Control de inventario</p><h1 className="text-2xl font-extrabold">Shortpick · evolutivo</h1>
          <p className="text-xs text-suave">Líneas de shortpick (cód. 4 y 17) valorizadas con el costo de la hoja VALOR. También alimentan la bolsa (motivo SHORTPICK).</p></div>
        <form className="flex items-end gap-2"><label className="flex flex-col gap-1 text-xs text-suave">Mes
          <select name="mes" defaultValue={sp.mes ?? ""} className="h-10 rounded-lg border border-borde bg-tarjeta px-2 text-sm text-texto"><option value="">Todos</option>{(d?.meses ?? []).map((m) => <option key={m}>{m}</option>)}</select></label>
          <button className="h-10 rounded-lg border border-borde bg-tarjeta px-3 text-sm">Ver</button></form>
      </header>
      {nivel("/cargas") === "editar" && <CargarShortpick cargados={d?.meses ?? []} />}
      {error && <p className="text-sm text-marca">{error.message}</p>}
      {!d?.kpi.lineas ? <p className="rounded-xl bg-tarjeta p-6 text-sm text-suave">Aún no hay meses cargados. Sube el archivo de shortpick de cada mes (enero a la fecha).</p> : (<>
        <Kpis items={[{ t: "Líneas de shortpick", v: fmtNum(d.kpi.lineas) }, { t: "Unidades", v: fmtNum(d.kpi.unidades), alerta: true }, { t: "Valor S/", v: S(d.kpi.valor), alerta: true },
          { t: "SKUs", v: fmtNum(d.kpi.skus) }, { t: "Grupos (olas)", v: fmtNum(d.kpi.grupos) }, { t: "Promedio por mes", v: S(d.kpi.valor / Math.max(1, (d.mensual ?? []).length)) }]} />
        <div className="grid gap-4 lg:grid-cols-2">
          <Combo titulo="Evolutivo mensual (S/)" datos={combo(d.mensual, (k) => MESES[Number(k.slice(5)) - 1])} />
          <Barras titulo="Líneas de shortpick por mes" datos={(d.mensual ?? []).map((x) => [MESES[Number(x.k.slice(5)) - 1], x.lineas] as [string, number])} color={() => "bg-red-600"} />
          <Combo titulo="Evolutivo semanal (S/)" datos={combo((d.semanal ?? []).slice(-12), (k) => k)} />
          <Barras titulo="Líneas por zona" datos={(d.zonas ?? []).slice(0, 15).map((x) => [x.k, x.lineas] as [string, number])} color={() => "bg-grafito"} />
        </div>
        <section className="rounded-xl bg-tarjeta p-5">
          <h2 className="mb-3 font-semibold text-marca">Evolutivo mensual</h2>
          <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm">
            <thead className="bg-grafito text-white"><tr>{["Mes", "Líneas", "Unidades", "SKUs", "Valor S/"].map((h) => <th key={h} className="px-2 py-2 text-right font-semibold first:text-left">{h}</th>)}</tr></thead>
            <tbody>{(d.mensual ?? []).map((x) => <tr key={x.k} className="border-b border-borde"><td className="px-2 py-1">{MESES[Number(x.k.slice(5)) - 1]} {x.k.slice(0, 4)}</td><td className="px-2 py-1 text-right">{fmtNum(x.lineas)}</td><td className="px-2 py-1 text-right">{fmtNum(Number(x.un))}</td><td className="px-2 py-1 text-right">{fmtNum(x.skus ?? 0)}</td><td className="px-2 py-1 text-right text-marca">{S(x.valor)}</td></tr>)}</tbody></table></div>
        </section>
        <section className="rounded-xl bg-tarjeta p-5">
          <h2 className="mb-3 font-semibold text-marca">Top 15 SKUs con más shortpick</h2>
          <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm">
            <thead className="bg-grafito text-left text-white"><tr>{["Cod Alternat", "Descripción", "Líneas", "Unidades", "Valor S/"].map((h) => <th key={h} className="px-2 py-2 font-semibold">{h}</th>)}</tr></thead>
            <tbody>{(d.skus ?? []).map((x) => <tr key={x.k} className="border-b border-borde"><td className="px-2 py-1">{x.k}</td><td className="max-w-72 truncate px-2 py-1">{x.d}</td><td className="px-2 py-1">{x.lineas}</td><td className="px-2 py-1">{fmtNum(Number(x.un))}</td><td className="px-2 py-1 text-marca">{S(x.valor)}</td></tr>)}</tbody></table></div>
        </section>
      </>)}
    </div>
  );
}
