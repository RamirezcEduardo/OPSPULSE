import { createClient } from "@/lib/supabase/server";
import { fmtFecha, fmtNum } from "@/lib/formato";
import { Barras, Kpis, agrupar } from "@/components/Graficos";
import { CargarActivos } from "./CargarActivos";

export const dynamic = "force-dynamic";
type A = { id: number; fecha: string; auditor_asignado: string | null; area: string | null; usuario_reabasto: string | null; turno: string | null;
  cod_alternat: string; descripcion: string | null; ubicacion: string; cant_sistema: number | null; cant_fisica: number | null; diferencia: number | null; observacion: string | null; validado_en: string | null };

export default async function ReabastoPage({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: cl } = await supabase.auth.getClaims();
  const { data: perfil } = await supabase.from("perfil").select("rol").eq("id", cl?.claims?.sub ?? "").maybeSingle();
  const { data: ult } = await supabase.from("auditoria_activo").select("fecha").order("fecha", { ascending: false }).limit(1);
  const ultima = ult?.[0]?.fecha as string | undefined;
  const desde = sp.desde ?? ultima ?? new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  const hasta = sp.hasta ?? desde;
  const { data, error } = await supabase.from("auditoria_activo").select("*").gte("fecha", desde).lte("fecha", hasta).limit(20000);
  const r = (data ?? []) as A[];
  const val = r.filter((x) => x.validado_en);
  const conf = val.filter((x) => Number(x.diferencia) === 0);
  const dif = val.filter((x) => Number(x.diferencia) !== 0);
  const falt = dif.reduce((s, x) => s + Math.min(0, Number(x.diferencia)), 0);
  const sob = dif.reduce((s, x) => s + Math.max(0, Number(x.diferencia)), 0);
  const inp = "h-10 rounded-lg border border-borde bg-tarjeta px-2 text-sm text-texto";
  const avance = agrupar(r, (x) => x.auditor_asignado).map(([k, n]) => [k, Math.round((r.filter((x) => (x.auditor_asignado || "Sin dato") === k && x.validado_en).length / n) * 100)] as [string, number]);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm text-suave">Seguimiento de operaciones</p><h1 className="text-2xl font-extrabold">Auditoría de reabasto</h1></div>
        <form className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-suave">Desde<input type="date" name="desde" defaultValue={desde} className={inp} /></label>
          <label className="flex flex-col gap-1 text-xs text-suave">Hasta<input type="date" name="hasta" defaultValue={hasta} className={inp} /></label>
          <button className="h-10 rounded-lg border border-borde bg-tarjeta px-3 text-sm">Ver</button>
        </form>
      </header>
      {perfil?.rol === "admin" && <CargarActivos />}
      {error && <p className="rounded-xl bg-tarjeta p-4 text-sm text-marca-oscuro">{error.message}</p>}
      {!r.length ? <p className="rounded-xl bg-tarjeta p-6 text-sm text-suave">Sin activos cargados para {fmtFecha(desde + "T12:00:00-05:00")}{hasta !== desde ? ` – ${fmtFecha(hasta + "T12:00:00-05:00")}` : ""}.</p> : (<>
        <Kpis items={[
          { t: "Activos asignados", v: fmtNum(r.length) },
          { t: "Validados", v: `${fmtNum(val.length)} / ${fmtNum(r.length)}`, s: `${r.length ? Math.round((val.length / r.length) * 100) : 0}% de avance` },
          { t: "Conformes", v: fmtNum(conf.length) },
          { t: "Con diferencia", v: fmtNum(dif.length), alerta: dif.length > 0 },
          { t: "% Exactitud", v: val.length ? `${((conf.length / val.length) * 100).toFixed(1)}%` : "—", alerta: val.length > 0 && conf.length < val.length },
          { t: "Unidades dif.", v: `${fmtNum(falt)} / +${fmtNum(sob)}`, s: "faltante / sobrante", alerta: falt < 0 },
        ]} />
        <section className="rounded-xl bg-tarjeta p-5">
          <h2 className="mb-3 font-semibold">Activos con diferencia ({dif.length})</h2>
          {!dif.length ? <p className="text-sm text-suave">{val.length ? "✓ Todos los validados están conformes." : "Aún no hay validaciones."}</p> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-sm">
              <thead className="text-left text-suave"><tr>{["Fecha", "Activo", "SKU", "Descripción", "Reabasteció", "WMS", "Físico", "Dif.", "Observación", "Auditor"].map((h) => <th key={h} className="border-b border-borde px-2 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>{dif.sort((a, b) => Number(a.diferencia) - Number(b.diferencia)).map((x) => (
                <tr key={x.id} className="border-b border-borde">
                  <td className="whitespace-nowrap px-2 py-2">{fmtFecha(x.fecha + "T12:00:00-05:00")}</td><td className="px-2 py-2 font-mono text-xs">{x.ubicacion}</td>
                  <td className="px-2 py-2">{x.cod_alternat}</td><td className="max-w-56 truncate px-2 py-2">{x.descripcion}</td><td className="px-2 py-2">{x.usuario_reabasto}</td>
                  <td className="px-2 py-2 tabular-nums">{x.cant_sistema}</td><td className="px-2 py-2 tabular-nums">{x.cant_fisica}</td>
                  <td className={`px-2 py-2 font-bold tabular-nums ${Number(x.diferencia) < 0 ? "text-marca" : "text-blue-700"}`}>{Number(x.diferencia) > 0 ? "+" : ""}{x.diferencia}</td>
                  <td className="max-w-64 px-2 py-2 text-xs">{x.observacion ?? "—"}</td><td className="px-2 py-2">{x.auditor_asignado}</td>
                </tr>))}</tbody></table></div>)}
        </section>
        <div className="grid gap-4 lg:grid-cols-2">
          <Barras titulo="Diferencias por usuario que reabasteció" datos={agrupar(dif, (x) => x.usuario_reabasto).slice(0, 12)} />
          <Barras titulo="Avance por auditor (%)" datos={avance} fmt={(n) => `${n}%`} />
          <Barras titulo="Diferencias por área" datos={agrupar(dif, (x) => x.area)} />
          <Barras titulo="Activos por turno de reabasto" datos={agrupar(r, (x) => x.turno)} />
        </div>
      </>)}
    </div>
  );
}
