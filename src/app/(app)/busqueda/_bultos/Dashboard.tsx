import { createClient } from "@/lib/supabase/server";
import { fmtNum, fmtSoles } from "@/lib/formato";
import { Barras, Kpis, agrupar } from "@/components/Graficos";
import { CargarBultos } from "./Cargar";
import { CargasVinculo } from "./CargasVinculo";
import { obtenerPermisos } from "@/lib/permisos";
import { FiltroSemana } from "@/components/FiltroSemana";

type V = { id: number; nro_lpn: string; cod_alternat: string; descripcion: string | null; proceso: string | null; supervisor: string | null; usuario_causo: string | null; dni_causo: string | null;
  cantidad_actual: number | null; valor_total: number | null; semana_calc: string; unidades_recuperadas: number; unidades_pendientes: number; val_tot: number | null; valor_pendiente: number; estado: string; diagnostico: string; familia_producto: string; masters: number | null; unidades_sueltas: number | null; caja_estandar: number | null; nro_grupo: string | null; ubicacion_envio: string | null; dias_demora: number; tramo: string; alerta: string | null; ubicacion: string | null };

export async function DashboardBultos({ clas, titulo, semana }: { clas: "perdidos" | "sin_ubicacion"; titulo: string; semana?: string }) {
  const supabase = await createClient();
  const { nivel } = await obtenerPermisos();
  const puedeCargar = nivel(clas === "perdidos" ? "/busqueda/perdidos" : "/busqueda/sin-ubicacion") === "editar";
  const { data: todos } = puedeCargar ? await supabase.from("bulto").select("nro_lpn,nro_grupo").in("estado", ["pendiente", "parcial"]).limit(1000) : { data: [] };
  const { data: ss } = await supabase.from("v_bulto").select("semana_calc").eq("clasificacion", clas).limit(20000);
  const semanas = [...new Set((ss ?? []).map((x) => x.semana_calc as string).filter(Boolean))].sort().reverse();
  let q = supabase.from("v_bulto").select("*").eq("clasificacion", clas).limit(20000);
  if (semana) q = q.eq("semana_calc", semana);
  const { data, error } = await q;
  const r = (data ?? []) as V[];
  const abiertos = r.filter((x) => x.estado === "pendiente" || x.estado === "parcial");
  const valPend = abiertos.reduce((s, x) => s + Number(x.valor_pendiente), 0);
  const valTot = r.reduce((s, x) => s + Number(x.valor_total ?? 0), 0);
  const ya = abiertos.filter((x) => x.alerta).length;
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm text-suave">Control de búsqueda de incidencias</p><h1 className="text-2xl font-extrabold">{titulo}</h1></div>
        <FiltroSemana semanas={semanas} actual={semana} />
      </header>
      {puedeCargar && <CargarBultos clas={clas} />}
      {puedeCargar && <CargasVinculo lpns={(todos ?? []).map((x) => x.nro_lpn)} grupos={[...new Set((todos ?? []).map((x) => x.nro_grupo).filter(Boolean) as string[])]} />}
      {error && <p className="rounded-xl bg-tarjeta p-4 text-sm text-marca-oscuro">{error.message}</p>}
      {!r.length ? <p className="rounded-xl bg-tarjeta p-6 text-sm text-suave">Aún no hay bultos cargados.</p> : (<>
        <Kpis items={[
          { t: "Bultos", v: fmtNum(r.length) }, { t: "Pendientes", v: fmtNum(abiertos.length), s: `${abiertos.filter((x) => x.estado === "parcial").length} parciales`, alerta: abiertos.length > 0 },
          { t: "Recuperados", v: fmtNum(r.filter((x) => x.estado === "recuperado").length) },
          { t: "Valor total", v: fmtSoles(valTot) }, { t: "Valor pendiente", v: fmtSoles(valPend), alerta: valPend > 0 },
          { t: "Ya no figuran", v: fmtNum(ya), s: "poner fecha de levantamiento", alerta: ya > 0 },
        ]} />
        <div className="grid gap-4 lg:grid-cols-2">
          <Barras titulo="Diagnóstico (bultos)" datos={agrupar(r, (x) => x.diagnostico)} />
          <Barras titulo="Diagnóstico (valor pendiente)" datos={agrupar(abiertos, (x) => x.diagnostico, (x) => Number(x.valor_pendiente))} fmt={fmtSoles} />
          <Barras titulo="Por familia (bultos)" datos={agrupar(r, (x) => x.familia_producto).slice(0, 12)} />
          <Barras titulo="Por familia (valor pendiente)" datos={agrupar(abiertos, (x) => x.familia_producto, (x) => Number(x.valor_pendiente)).slice(0, 12)} fmt={fmtSoles} />
          <Barras titulo="Pendientes por tramo de demora" datos={agrupar(abiertos, (x) => x.tramo).sort((a, b) => a[0].localeCompare(b[0]))} />
          <Barras titulo="Estado" datos={agrupar(r, (x) => x.estado)} />
          <Barras titulo="Valor pendiente por proceso" datos={agrupar(abiertos, (x) => x.proceso, (x) => Number(x.valor_pendiente))} fmt={fmtSoles} />
          <Barras titulo="Pendientes por supervisor a cargo" datos={agrupar(abiertos, (x) => x.supervisor || "Sin asignar").slice(0, 12)} />
          <Barras titulo="Usuario que causó la falencia (bultos)" datos={agrupar(r, (x) => x.usuario_causo || "Sin asignar").slice(0, 12)} />
          <Barras titulo="Por proceso" datos={agrupar(r, (x) => x.proceso)} />
          <Barras titulo="Zona donde se reportó (bultos)" datos={agrupar(r.filter((x) => x.ubicacion_envio), (x) => (x.ubicacion_envio ?? "").split("-")[0]).slice(0, 12)} />
          <Barras titulo="Valor pendiente por zona reportada" datos={agrupar(abiertos.filter((x) => x.ubicacion_envio), (x) => (x.ubicacion_envio ?? "").split("-")[0], (x) => Number(x.valor_pendiente)).slice(0, 12)} fmt={fmtSoles} />
          <Barras titulo="Bultos por semana" datos={agrupar(r, (x) => x.semana_calc).sort((a, b) => a[0].localeCompare(b[0]))} />
        </div>
        {(() => {
          const fams = agrupar(r, (x) => x.familia_producto).slice(0, 8).map(([f]) => f);
          const sems = [...new Set(r.map((x) => x.semana_calc))].sort().slice(-8);
          return (
            <section className="rounded-xl bg-tarjeta p-5">
              <h2 className="mb-3 font-semibold">Tendencia por familia (bultos por semana)</h2>
              <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-suave"><tr><th className="border-b border-borde px-2 py-2 font-medium">Familia</th>{sems.map((s) => <th key={s} className="border-b border-borde px-2 py-2 text-right font-medium">{s.replace("-S", " S")}</th>)}</tr></thead>
                <tbody>{fams.map((f) => (
                  <tr key={f} className="border-b border-borde"><td className="px-2 py-1.5">{f}</td>
                    {sems.map((s) => { const n = r.filter((x) => x.familia_producto === f && x.semana_calc === s).length;
                      return <td key={s} className={`px-2 py-1.5 text-right tabular-nums ${n ? "font-semibold" : "text-suave"}`}>{n || "·"}</td>; })}</tr>))}</tbody>
              </table></div>
            </section>);
        })()}
        <section className="rounded-xl bg-tarjeta p-5">
          <h2 className="mb-3 font-semibold">Pendientes más antiguos</h2>
          <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm">
            <thead className="text-left text-suave"><tr>{["Días", "LPN", "Grupo", "Ubic. reportada", "SKU", "Descripción", "Diagnóstico", "Familia", "Supervisor", "Causó", "Pend. und", "Valor pend.", "Estado", "Alerta"].map((h) => <th key={h} className="border-b border-borde px-2 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>{abiertos.sort((a, b) => b.dias_demora - a.dias_demora).slice(0, 100).map((x) => (
              <tr key={x.id} className="border-b border-borde">
                <td className="px-2 py-2 font-semibold tabular-nums">{x.dias_demora}</td><td className="px-2 py-2 font-mono text-xs">{x.nro_lpn}</td><td className="px-2 py-2 font-mono text-xs">{x.nro_grupo ?? "—"}</td><td className="px-2 py-2 font-mono text-xs">{x.ubicacion_envio ?? "—"}</td>
                <td className="px-2 py-2">{x.cod_alternat}</td><td className="max-w-56 truncate px-2 py-2">{x.descripcion}</td><td className="px-2 py-2 text-xs">{x.diagnostico}{x.masters ? ` (${x.masters} master${x.masters > 1 ? "s" : ""}${x.unidades_sueltas ? ` + ${x.unidades_sueltas} und` : ""})` : ""}</td><td className="px-2 py-2 text-xs">{x.familia_producto}</td><td className="px-2 py-2">{x.supervisor ?? "—"}</td><td className="px-2 py-2">{x.usuario_causo ?? "—"}</td>
                <td className="px-2 py-2 tabular-nums">{fmtNum(x.unidades_pendientes)}</td><td className="px-2 py-2 tabular-nums">{fmtSoles(Number(x.valor_pendiente))}</td>
                <td className="px-2 py-2">{x.estado}</td><td className="px-2 py-2 text-xs font-semibold text-marca">{x.alerta ?? ""}</td>
              </tr>))}</tbody></table></div>
        </section>
      </>)}
    </div>
  );
}
