import { fmtFecha, fmtNum, fmtSoles } from "@/lib/formato";
import { Barras } from "@/components/Graficos";
import { Lineas } from "@/components/Lineas";
import { cargar, Filtros, Kpis, nomMes, TopProductos } from "../datos";

export const dynamic = "force-dynamic";
export default async function MermaArea({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const area = sp.area || "MEZZANINE";
  const { d, error } = await cargar({ ...sp, area });
  if (!d) return <p className="rounded-xl bg-tarjeta p-6 text-sm text-suave">{error ?? "Sin datos"}</p>;
  const k = d.kpi;
  const meses = [...new Set((d.mensual ?? []).map((x) => x.mes))].sort();
  const mes = (m: string, a?: string) => (d.mensual ?? []).filter((x) => x.mes === m && (!a || x.area === a));
  const s = (xs: { v: number; u: number; l: number }[], c: "v" | "u" | "l") => xs.reduce((t, x) => t + Number(x[c]), 0);
  const th = "px-2 py-2 font-semibold";
  let ant = 0;
  return (
    <div className="flex flex-col gap-5">
      <header><p className="text-sm text-suave">Control de inventario</p><h1 className="text-2xl font-extrabold">MERMA POR ÁREA · {area}</h1>
        <p className="text-sm text-suave">Data al {k.hasta ? fmtFecha(k.hasta + "T12:00:00-05:00") : "—"} · Valores en S/</p></header>
      <Filtros d={d} sp={{ ...sp, area }} area />
      <Kpis items={[["Merma del área S/", fmtSoles(Number(k.valor)), "text-marca"], ["% de la merma del CD", k.cd ? `${((Number(k.valor) / Number(k.cd)) * 100).toFixed(1)}%` : "—"], ["Unidades mermadas", fmtNum(Number(k.und))],
        ["LPN mermados", fmtNum(Number(k.lpn))], ["Promedio mensual S/ (meses cerrados)", k.prom == null ? "—" : fmtSoles(Number(k.prom))], ["Mes en curso (parcial) S/", fmtSoles(Number(k.curso))]]} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Lineas titulo={`Evolutivo mensual · ${area} (S/)`} min={0} series={["Merma"]} datos={meses.map((m) => ({ x: nomMes(m).slice(8), Merma: Math.round(s(mes(m, area), "v")) }))} />
        <Barras titulo="Merma del área por familia (S/)" datos={(d.familias ?? []).map((x) => [x.k ?? "Sin familia", Number(x.v)] as [string, number])} fmt={fmtSoles} color={() => "bg-red-600"} />
      </div>
      <section className="rounded-xl bg-tarjeta p-5"><h2 className="mb-3 font-semibold text-marca">Evolutivo mensual del área</h2>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm">
          <thead className="bg-grafito text-white"><tr>{["Mes", "Merma S/", "Unidades", "LPN", "% de la merma del CD en el mes", "Variación vs mes anterior"].map((h) => <th key={h} className={`${th} text-right first:text-left`}>{h}</th>)}</tr></thead>
          <tbody>{meses.map((m) => { const a = mes(m, area), v = s(a, "v"), cd = s(mes(m), "v"); const var_ = ant ? (v - ant) / ant : null; ant = v; return (
            <tr key={m} className="border-b border-borde text-right tabular-nums"><td className="px-2 py-1 text-left">{nomMes(m)}</td><td className="px-2 py-1 font-semibold text-marca">{fmtSoles(v)}</td><td className="px-2 py-1">{fmtNum(s(a, "u"))}</td>
              <td className="px-2 py-1">{fmtNum(s(a, "l"))}</td><td className="px-2 py-1">{cd ? ((v / cd) * 100).toFixed(1) : 0}%</td>
              <td className={`px-2 py-1 ${var_ == null ? "" : var_ > 0 ? "text-marca" : "text-green-700"}`}>{var_ == null ? "—" : `${var_ > 0 ? "▲" : "▼"} ${(Math.abs(var_) * 100).toFixed(1)}%`}</td></tr>); })}</tbody></table></div>
      </section>
      <section className="rounded-xl bg-tarjeta p-5"><h2 className="mb-3 font-semibold text-marca">Merma del área por familia</h2>
        <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm">
          <thead className="bg-grafito text-left text-white"><tr>{["Familia", "Merma S/", "Unidades", "LPN", "% del área"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>{(d.familias ?? []).map((x) => (
            <tr key={x.k} className="border-b border-borde"><td className="px-2 py-1">{x.k}</td><td className="px-2 py-1 text-right font-semibold text-marca">{fmtSoles(Number(x.v))}</td><td className="px-2 py-1 text-right">{fmtNum(Number(x.u))}</td>
              <td className="px-2 py-1 text-right">{fmtNum(x.l)}</td><td className="px-2 py-1 text-right">{k.valor ? ((Number(x.v) / Number(k.valor)) * 100).toFixed(1) : 0}%</td></tr>))}</tbody></table></div>
      </section>
      <TopProductos d={d} titulo={`Top 15 productos más mermados · ${area}`} total={Number(k.valor)} area />
    </div>
  );
}
