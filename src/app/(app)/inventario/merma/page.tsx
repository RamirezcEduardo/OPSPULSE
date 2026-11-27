import { obtenerPermisos } from "@/lib/permisos";
import { fmtFecha, fmtNum, fmtSoles } from "@/lib/formato";
import { Barras } from "@/components/Graficos";
import { Lineas } from "@/components/Lineas";
import { CargarMerma } from "./Cargar";
import { cargar, Filtros, Kpis, nomMes, TopProductos } from "./datos";

export const dynamic = "force-dynamic";
export default async function Merma({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { nivel } = await obtenerPermisos();
  const { d, error } = await cargar(sp);
  const puede = nivel("/inventario/merma") === "editar";
  if (!d || !d.kpi.lpn && !sp.familia && !sp.mes && !sp.semana) return (
    <div className="flex flex-col gap-5"><header><p className="text-sm text-suave">Control de inventario</p><h1 className="text-2xl font-extrabold">EVOLUTIVO DE MERMA · CD11 (GENERAL)</h1></header>
      {puede && <CargarMerma />}<p className="rounded-xl bg-tarjeta p-6 text-sm text-suave">{error ?? "Aún no hay merma cargada. Sube la hoja DATA del EVOLUTIVO DE MERMA."}</p></div>);
  const k = d.kpi;
  const areas = (d.areas ?? []).map((x) => x.k).filter(Boolean);
  const meses = [...new Set((d.mensual ?? []).map((x) => x.mes))].sort();
  const celda = (m: string, a?: string) => (d.mensual ?? []).filter((x) => x.mes === m && (!a || x.area === a)).reduce((t, x) => t + Number(x.v), 0);
  const th = "px-2 py-2 font-semibold";
  return (
    <div className="flex flex-col gap-5">
      <header><p className="text-sm text-suave">Control de inventario</p><h1 className="text-2xl font-extrabold">EVOLUTIVO DE MERMA · CD11 (GENERAL)</h1>
        <p className="text-sm text-suave">Data al {k.hasta ? fmtFecha(k.hasta + "T12:00:00-05:00") : "—"} · Valores en S/</p></header>
      {puede && <CargarMerma />}
      <Filtros d={d} sp={sp} />
      <Kpis items={[["Merma acumulada S/", fmtSoles(Number(k.valor)), "text-marca"], ["Unidades mermadas", fmtNum(Number(k.und))], ["LPN mermados", fmtNum(Number(k.lpn))],
        ["Promedio mensual S/ (meses cerrados)", k.prom == null ? "—" : fmtSoles(Number(k.prom))], ["Mes con más merma", k.mesmax ? nomMes(k.mesmax) : "—"], [`Mes en curso (parcial) S/`, fmtSoles(Number(k.curso))]]} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Lineas titulo="Evolutivo mensual · total CD (S/)" min={0} series={["Merma"]} datos={meses.map((m) => ({ x: nomMes(m).slice(8), Merma: Math.round(celda(m)) }))} />
        <Barras titulo="Merma por área (S/)" datos={(d.areas ?? []).map((x) => [x.k ?? "Sin área", Number(x.v)] as [string, number])} fmt={fmtSoles} color={() => "bg-red-600"} />
      </div>
      <section className="rounded-xl bg-tarjeta p-5"><h2 className="mb-3 font-semibold text-marca">Evolutivo mensual por área (S/)</h2>
        <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-grafito text-white"><tr><th className={`${th} text-left`}>Mes</th><th className={`${th} text-right`}>TOTAL CD</th>{areas.map((a) => <th key={a} className={`${th} text-right`}>{a}</th>)}</tr></thead>
          <tbody>{meses.map((m) => (
            <tr key={m} className="border-b border-borde text-right tabular-nums"><td className="px-2 py-1 text-left">{nomMes(m)}</td><td className="px-2 py-1 font-bold">{fmtSoles(celda(m))}</td>
              {areas.map((a) => { const v = celda(m, a); return <td key={a} className="px-2 py-1">{v ? fmtSoles(v) : ""}</td>; })}</tr>))}</tbody></table></div>
      </section>
      <section className="rounded-xl bg-tarjeta p-5"><h2 className="mb-3 font-semibold text-marca">Ranking de áreas (acumulado)</h2>
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
          <thead className="bg-grafito text-left text-white"><tr>{["Área", "Merma S/", "Unidades", "LPN", "% del CD", "Promedio mensual S/"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>{(d.areas ?? []).map((x) => (
            <tr key={x.k} className="border-b border-borde"><td className="px-2 py-1">{x.k}</td><td className="px-2 py-1 text-right font-semibold text-marca">{fmtSoles(Number(x.v))}</td><td className="px-2 py-1 text-right">{fmtNum(Number(x.u))}</td>
              <td className="px-2 py-1 text-right">{fmtNum(x.l)}</td><td className="px-2 py-1 text-right">{k.cd ? ((Number(x.v) / Number(k.cd)) * 100).toFixed(1) : 0}%</td><td className="px-2 py-1 text-right">{fmtSoles(Number(x.v) / Math.max(1, x.m))}</td></tr>))}</tbody></table></div>
      </section>
      <TopProductos d={d} titulo="Top 15 productos más mermados · CD general" total={Number(k.valor)} />
    </div>
  );
}
