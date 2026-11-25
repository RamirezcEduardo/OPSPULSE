import { createClient } from "@/lib/supabase/server";
import { obtenerPermisos } from "@/lib/permisos";
import { fmtNum, fmtSoles } from "@/lib/formato";
import { Barras } from "@/components/Graficos";
import { Tendencia } from "@/components/Lineas";
import { CargarShortpick } from "./Cargar";

export const dynamic = "force-dynamic";
type A = { k: string; valor: number; un: number; ev: number };
type R = {
  kpi: { eventos: number; unidades: number; valor: number; skus: number; ubicaciones: number; areas: number };
  semanal: A[] | null; areas: A[] | null; mensual: { k: string; valor: number; ev: number }[] | null; diario: { k: string; valor: number }[] | null; mes_diario: string | null;
  area_sem: { a: string; s: string; valor: number; ev: number }[] | null; sems: string[] | null;
  productos: { k: string; d: string; area: string; ev: number; un: number; valor: number }[] | null; ubicaciones: { k: string; area: string; ev: number; un: number; valor: number }[] | null;
  pantallas: { k: string; c: number; ev: number; un: number; valor: number }[] | null; turnos: { k: string; ev: number; un: number; valor: number }[] | null;
  opciones: { meses: string[] | null; semanas: string[] | null; areas: string[] | null; cods: number[] | null };
};
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];
const HORARIO: Record<string, string> = { "MAÑANA": "07:00-11:59", "MAÑANA/TARDE": "12:00-15:59", TARDE: "16:00-20:59", NOCHE: "21:00-06:59" };
const S = (v: number | null | undefined) => fmtSoles(Number(v ?? 0));
const ma = (xs: number[], n: number) => xs.map((_, i) => { const w = xs.slice(Math.max(0, i - n + 1), i + 1); return w.reduce((a, b) => a + b, 0) / w.length; });

export default async function Shortpick({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const s = await createClient();
  const { nivel } = await obtenerPermisos();
  const { data, error } = await s.rpc("shortpick_dash", { p_mes: sp.mes || null, p_semana: sp.semana || null, p_area: sp.area || null, p_cod: sp.cod ? Number(sp.cod) : null, p_turno: sp.turno || null });
  const d = data as R | null;
  const sel = "h-9 rounded-lg border border-borde bg-tarjeta px-2 text-sm text-texto";
  const th = "px-2 py-1.5 font-semibold";
  const k = d?.kpi;
  const sem = d?.semanal ?? [], mens = d?.mensual ?? [], dia = d?.diario ?? [];
  const sv = ma(sem.map((x) => Number(x.valor)), 4), su = ma(sem.map((x) => Number(x.un)), 4), mv = ma(mens.map((x) => Number(x.valor)), 3), dv = ma(dia.map((x) => Number(x.valor)), 7);
  let acum = 0;
  const mesActual = new Date().toISOString().slice(0, 7);
  const areasOrden = (d?.areas ?? []).map((x) => x.k);
  const maxV = Math.max(1, ...(d?.area_sem ?? []).map((x) => Number(x.valor))), maxE = Math.max(1, ...(d?.area_sem ?? []).map((x) => x.ev));
  const calor = (cuadro: "valor" | "ev") => (
    <section className="rounded-xl bg-tarjeta p-5">
      <h2 className="mb-3 font-semibold text-marca">{cuadro === "valor" ? "Valor S/" : "Eventos de shortpick"} por área y semana <span className="text-xs font-normal text-suave">(últimas 10 semanas del filtro)</span></h2>
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-xs">
        <thead className="bg-grafito text-white"><tr><th className={`${th} text-left`}>Área</th>{(d?.sems ?? []).map((x) => <th key={x} className={th}>{x.slice(5)}</th>)}<th className={th}>Total</th></tr></thead>
        <tbody>{areasOrden.map((a) => { const fila = (d?.area_sem ?? []).filter((x) => x.a === a); const tot = fila.reduce((t, x) => t + Number(cuadro === "valor" ? x.valor : x.ev), 0);
          return <tr key={a} className="border-b border-borde"><td className="px-2 py-1">{a}</td>
            {(d?.sems ?? []).map((w) => { const c = fila.find((x) => x.s === w); const v = c ? Number(cuadro === "valor" ? c.valor : c.ev) : 0;
              return <td key={w} className="px-2 py-1 text-center tabular-nums" style={{ background: v ? `rgba(239,68,68,${0.12 + (0.7 * v) / (cuadro === "valor" ? maxV : maxE)})` : undefined }}>{cuadro === "valor" ? S(v) : v || ""}</td>; })}
            <td className="px-2 py-1 text-center font-semibold tabular-nums">{cuadro === "valor" ? S(tot) : fmtNum(tot)}</td></tr>; })}</tbody></table></div>
    </section>);

  return (
    <div className="flex flex-col gap-5">
      <header className="border-b-4 border-marca pb-2">
        <h1 className="text-2xl font-extrabold">CONTROL DE SHORTPICK {new Date().getFullYear()} · CD11</h1>
        <p className="text-xs text-suave">Ajustes por shortpick · historiales 4 y 17 · por área y semana</p>
      </header>
      {nivel("/cargas") === "editar" && <CargarShortpick cargados={d?.opciones.meses ?? []} />}
      <form className="flex flex-wrap items-end gap-2 rounded-xl bg-tarjeta p-3">
        {([["mes", "Mes", d?.opciones.meses ?? []], ["semana", "Semana", d?.opciones.semanas ?? []], ["area", "Área", d?.opciones.areas ?? []], ["cod", "Historial", (d?.opciones.cods ?? []).map(String)], ["turno", "Turno", Object.keys(HORARIO)]] as [string, string, string[]][]).map(([n, l, ops]) => (
          <label key={n} className="flex flex-col gap-1 text-xs text-suave">{l}<select name={n} defaultValue={sp[n] ?? ""} className={sel}><option value="">Todos</option>{ops.map((o) => <option key={o}>{o}</option>)}</select></label>))}
        <button className="h-9 rounded-lg bg-marca px-4 text-sm font-semibold text-white">Ver</button>
      </form>
      {error && <p className="text-sm text-marca">{error.message}</p>}
      {!k?.eventos ? <p className="rounded-xl bg-tarjeta p-6 text-sm text-suave">Sin datos. Sube el archivo de shortpick de cada mes (enero a la fecha).</p> : (<>
        <section className="grid grid-cols-2 overflow-hidden rounded-xl bg-tarjeta sm:grid-cols-4 xl:grid-cols-7">
          {[["Eventos", fmtNum(k.eventos), ""], ["Unidades", fmtNum(k.unidades), ""], ["Valor S/", S(k.valor), "text-marca"], ["SKUs afectados", fmtNum(k.skus), ""], ["Ubicaciones afectadas", fmtNum(k.ubicaciones), ""], ["Áreas con shortpick", fmtNum(k.areas), ""], ["S/ promedio por evento", S(k.valor / Math.max(1, k.eventos)), ""]].map(([t, v, c]) => (
            <div key={t} className="text-center"><p className="bg-grafito py-1 text-xs font-semibold text-white">{t}</p><p className={`px-1 py-3 text-lg font-bold tabular-nums sm:text-2xl ${c}`}>{v}</p></div>))}
        </section>
        <div className="grid gap-4 lg:grid-cols-2">
          <Tendencia titulo="Valor S/ por semana y tendencia" nota="Línea roja: S/ de la semana · Línea negra: promedio móvil 4 semanas" nombre="Valor S/" nombreMA="Tendencia S/ (prom. móvil 4 sem.)" datos={sem.map((x, i) => ({ x: x.k.slice(5), v: Number(x.valor), ma: sv[i] }))} />
          <Barras titulo="Valor S/ por área" datos={(d?.areas ?? []).map((x) => [x.k, Number(x.valor)] as [string, number])} fmt={S} color={() => "bg-red-600"} />
          <Tendencia titulo="Unidades por semana y tendencia" nota="Línea gris: unidades de la semana · Línea roja: promedio móvil 4 semanas" soles={false} color="#9CA3AF" colorMA="#E11D2E" nombre="Unidades" nombreMA="Tendencia unidades (prom. móvil 4 sem.)" datos={sem.map((x, i) => ({ x: x.k.slice(5), v: Number(x.un), ma: su[i] }))} />
          <Barras titulo="Unidades por área" datos={(d?.areas ?? []).map((x) => [x.k, Number(x.un)] as [string, number])} color={() => "bg-grafito"} />
        </div>
        <Tendencia titulo="Evolución mensual · todo el año (respeta los filtros de Área, Historial y Turno; * = mes en curso)" nota="Línea roja: S/ del mes · Línea negra: tendencia (promedio 3 meses) · Línea gris (eje derecho): eventos"
          nombre="Valor S/" nombreMA="Tendencia S/ (prom. 3 meses)" nombreDer="Eventos" datos={mens.map((x, i) => ({ x: MESES[Number(x.k.slice(5)) - 1] + (x.k === mesActual ? "*" : ""), v: Number(x.valor), ma: mv[i], der: x.ev }))} />
        <Tendencia titulo={`Evolución diaria del mes · ${d?.mes_diario ?? ""} (mes más reciente; elige otro mes en el filtro)`} nota="Línea roja: S/ del día · Línea negra: promedio móvil 7 días · Línea gris punteada (eje derecho): acumulado del mes"
          nombre="Valor S/" nombreMA="Tendencia S/ (prom. móvil 7 días)" nombreDer="Acumulado del mes S/" datos={dia.map((x, i) => { acum += Number(x.valor); return { x: `${x.k.slice(8)}/${x.k.slice(5, 7)}`, v: Number(x.valor), ma: dv[i], der: acum }; })} />
        {calor("valor")}
        {calor("ev")}
        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-xl bg-tarjeta p-5"><h2 className="mb-3 font-semibold text-marca">Top 15 productos por valor S/</h2>
            <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead className="bg-grafito text-left text-white"><tr>{["Cod Alternat", "Descripción", "Área", "Eventos", "Unidades", "Valor S/"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>{(d?.productos ?? []).map((x) => <tr key={x.k} className="border-b border-borde"><td className="px-2 py-1">{x.k}</td><td className="max-w-56 truncate px-2 py-1">{x.d}</td><td className="px-2 py-1">{x.area}</td><td className="px-2 py-1 text-right">{fmtNum(x.ev)}</td><td className="px-2 py-1 text-right">{fmtNum(Number(x.un))}</td><td className="px-2 py-1 text-right">{S(x.valor)}</td></tr>)}</tbody></table></div></section>
          <section className="rounded-xl bg-tarjeta p-5"><h2 className="mb-3 font-semibold text-marca">Top 15 ubicaciones con más eventos</h2>
            <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead className="bg-grafito text-left text-white"><tr>{["Ubicación", "Área", "Eventos", "Unidades", "Valor S/"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>{(d?.ubicaciones ?? []).map((x) => <tr key={x.k} className="border-b border-borde"><td className="px-2 py-1 font-mono text-xs">{x.k}</td><td className="px-2 py-1">{x.area}</td><td className="px-2 py-1 text-right">{fmtNum(x.ev)}</td><td className="px-2 py-1 text-right">{fmtNum(Number(x.un))}</td><td className="px-2 py-1 text-right">{S(x.valor)}</td></tr>)}</tbody></table></div></section>
          <section className="rounded-xl bg-tarjeta p-5"><h2 className="mb-3 font-semibold text-marca">Por pantalla e historial</h2>
            <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead className="bg-grafito text-left text-white"><tr>{["Pantalla", "Cód.", "Eventos", "Unidades", "Valor S/"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>{(d?.pantallas ?? []).map((x) => <tr key={`${x.k}${x.c}`} className="border-b border-borde"><td className="px-2 py-1">{x.k}</td><td className="px-2 py-1">{x.c}</td><td className="px-2 py-1 text-right">{fmtNum(x.ev)}</td><td className="px-2 py-1 text-right">{fmtNum(Number(x.un))}</td><td className="px-2 py-1 text-right">{S(x.valor)}</td></tr>)}</tbody></table></div></section>
          <section className="rounded-xl bg-tarjeta p-5"><h2 className="mb-3 font-semibold text-marca">Por turno (hora de creación)</h2>
            <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead className="bg-grafito text-left text-white"><tr>{["Turno", "Horario", "Eventos", "Unidades", "Valor S/", "% valor"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>{(d?.turnos ?? []).map((x) => <tr key={x.k} className="border-b border-borde"><td className="px-2 py-1">{x.k}</td><td className="px-2 py-1">{HORARIO[x.k]}</td><td className="px-2 py-1 text-right">{fmtNum(x.ev)}</td><td className="px-2 py-1 text-right">{fmtNum(Number(x.un))}</td><td className="px-2 py-1 text-right">{S(x.valor)}</td><td className="px-2 py-1 text-right">{((Number(x.valor) / Math.max(1, Number(k.valor))) * 100).toFixed(1)}%</td></tr>)}</tbody></table></div></section>
        </div>
      </>)}
    </div>
  );
}
