import { createClient } from "@/lib/supabase/server";
import { fmtNum, fmtSoles } from "@/lib/formato";
import { Barras } from "@/components/Graficos";
import { Combo } from "@/components/Lineas";
import { FiltroSemana } from "@/components/FiltroSemana";

export const dynamic = "force-dynamic";
type B = { clasificacion: string; estado: string; semana_calc: string | null; cantidad_actual: number | null; unidades_recuperadas: number; unidades_pendientes: number;
  valor_total: number | null; valor_pendiente: number; tramo: string | null; diagnostico: string | null; ubicacion_envio: string | null; supervisor: string | null; dias_demora: number };
const NOM: Record<string, string> = { perdidos: "Perdidos", sin_ubicacion: "Sin ubicación" };

export default async function ResumenBusqueda({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const { semana } = await searchParams;
  const s = await createClient();
  const todo: B[] = [];
  for (let d = 0; ; d += 1000) {
    const { data } = await s.from("v_bulto").select("clasificacion,estado,semana_calc,cantidad_actual,unidades_recuperadas,unidades_pendientes,valor_total,valor_pendiente,tramo,diagnostico,ubicacion_envio,supervisor,dias_demora").order("id").range(d, d + 999);
    todo.push(...((data ?? []) as B[])); if (!data || data.length < 1000) break;
  }
  const kpi = (r: B[]) => {
    const vt = r.reduce((a, x) => a + Number(x.valor_total ?? 0), 0), vp = r.reduce((a, x) => a + Number(x.valor_pendiente ?? 0), 0);
    const ut = r.reduce((a, x) => a + Number(x.cantidad_actual ?? 0), 0), ur = r.reduce((a, x) => a + Number(x.unidades_recuperadas ?? 0), 0);
    return { tickets: r.length, abiertos: r.filter((x) => x.estado !== "recuperado").length, parciales: r.filter((x) => x.estado === "parcial").length,
      cerrados: r.filter((x) => x.estado === "recuperado").length, ut, ur, up: r.reduce((a, x) => a + Number(x.unidades_pendientes ?? 0), 0), vt, vr: vt - vp, vp };
  };
  const todasSem = [...new Set(todo.map((x) => x.semana_calc).filter(Boolean) as string[])].sort().reverse();
  const base = todo;
  const sel = semana ? todo.filter((x) => x.semana_calc === semana) : todo;
  const grupos = ["perdidos", "sin_ubicacion"].map((c) => ({ c, r: sel.filter((x) => x.clasificacion === c) }));
  const t = kpi(sel);
  const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : "—");
  const semanas = [...new Set(base.map((x) => x.semana_calc).filter(Boolean) as string[])].sort().slice(-10);
  const abiertos = sel.filter((x) => x.estado !== "recuperado");
  const agr = (r: B[], k: (x: B) => string | null, v: (x: B) => number) => { const m = new Map<string, number>(); r.forEach((x) => { const key = k(x) || "Sin dato"; m.set(key, (m.get(key) ?? 0) + v(x)); }); return [...m].sort((a, b) => b[1] - a[1]); };
  const zona = (u: string | null) => (u ? u.split("-")[0] : "Sin ubicación reportada");
  const th = "px-3 py-2 font-semibold";

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm text-suave">Control de búsqueda de incidencias</p><h1 className="text-2xl font-extrabold">Resumen · Perdidos y Sin ubicación</h1>{semana && <p className="text-sm text-suave">Semana {semana} · los gráficos por semana muestran todas</p>}</div><FiltroSemana semanas={todasSem} actual={semana} /></header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {[["Tickets", fmtNum(t.tickets), `${fmtNum(t.abiertos)} abiertos · ${fmtNum(t.cerrados)} cerrados`, ""],
          ["Valor total", fmtSoles(t.vt), `${fmtNum(t.ut)} und`, ""],
          ["Recuperado", fmtSoles(t.vr), `${fmtNum(t.ur)} und · ${pct(t.vr, t.vt)}`, "text-green-700 dark:text-green-400"],
          ["Pendiente", fmtSoles(t.vp), `${fmtNum(t.up)} und`, "text-marca"],
          ["Parciales", fmtNum(t.parciales), "en arrastre", "text-amber-600"],
          ["% recuperado", pct(t.vr, t.vt), "en S/", ""]].map(([a, b, c, col]) => (
          <div key={a} className="rounded-xl bg-tarjeta p-4"><p className="text-xs text-suave">{a}</p><p className={`mt-1 text-xl font-bold tabular-nums ${col}`}>{b}</p><p className="text-xs text-suave">{c}</p></div>))}
      </section>

      <section className="rounded-xl bg-tarjeta p-5">
        <h2 className="mb-3 font-semibold text-marca">Perdidos vs Sin ubicación</h2>
        <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm">
          <thead className="bg-grafito text-white"><tr>{["", "Tickets", "Abiertos", "Parciales", "Cerrados", "Und recuperadas", "Und pendientes", "S/ total", "S/ recuperado", "S/ pendiente", "% recuperado"].map((h) => <th key={h} className={`${th} text-right first:text-left`}>{h}</th>)}</tr></thead>
          <tbody>{[...grupos.map(({ c, r }) => [NOM[c], kpi(r)] as const), ["Total", t] as const].map(([n, k]) => (
            <tr key={n} className={`border-b border-borde text-right tabular-nums ${n === "Total" ? "bg-fondo font-bold" : ""}`}>
              <td className="px-3 py-2 text-left font-semibold">{n}</td><td className="px-3 py-2">{fmtNum(k.tickets)}</td><td className="px-3 py-2">{fmtNum(k.abiertos)}</td><td className="px-3 py-2 text-amber-600">{fmtNum(k.parciales)}</td>
              <td className="px-3 py-2">{fmtNum(k.cerrados)}</td><td className="px-3 py-2 text-green-700">{fmtNum(k.ur)}</td><td className="px-3 py-2 text-marca">{fmtNum(k.up)}</td>
              <td className="px-3 py-2">{fmtSoles(k.vt)}</td><td className="px-3 py-2 text-green-700">{fmtSoles(k.vr)}</td><td className="px-3 py-2 text-marca">{fmtSoles(k.vp)}</td><td className="px-3 py-2 font-semibold">{pct(k.vr, k.vt)}</td></tr>))}</tbody></table></div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {["perdidos", "sin_ubicacion"].map((c) => ({ c, r: base.filter((x) => x.clasificacion === c) })).map(({ c, r }) => (
          <Combo key={c} nombres={["S/ pendiente", "S/ recuperado", "Diferencia"]} titulo={`${NOM[c]} · valor por semana (S/): pendiente vs recuperado`}
            datos={semanas.map((w) => { const x = r.filter((b) => b.semana_calc === w); const vt = x.reduce((a, b) => a + Number(b.valor_total ?? 0), 0), vp = x.reduce((a, b) => a + Number(b.valor_pendiente ?? 0), 0);
              return { x: w.slice(5), falt: -vp, sob: vt - vp, neto: vt - vp - vp }; })} />))}
      </div>
      <p className="-mt-3 text-xs text-suave">Barras rojas: S/ pendiente · barras grises: S/ recuperado · línea: diferencia (recuperado − pendiente).</p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Barras titulo="Pendiente por antigüedad (S/)" datos={agr(abiertos, (x) => x.tramo, (x) => Number(x.valor_pendiente))} fmt={(n) => fmtSoles(n)} color={() => "bg-red-600"} />
        <Barras titulo="Pendiente por diagnóstico (tickets)" datos={agr(abiertos, (x) => (x.diagnostico ?? "").split(" –")[0] || null, () => 1)} color={() => "bg-grafito"} />
        <Barras titulo="Pendiente por zona reportada (S/)" datos={agr(abiertos, (x) => zona(x.ubicacion_envio), (x) => Number(x.valor_pendiente)).slice(0, 12)} fmt={(n) => fmtSoles(n)} color={() => "bg-red-600"} />
        <Barras titulo="Recuperado por supervisor (S/)" datos={agr(sel, (x) => x.supervisor, (x) => Number(x.valor_total ?? 0) - Number(x.valor_pendiente ?? 0)).filter(([, v]) => v > 0).slice(0, 12)} fmt={(n) => fmtSoles(n)} color={() => "bg-green-600"} />
      </div>
    </div>
  );
}
