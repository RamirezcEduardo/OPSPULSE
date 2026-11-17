import { createClient } from "@/lib/supabase/server";
import { fmtNum, fmtSoles } from "@/lib/formato";
import { Barras, Kpis, agrupar } from "@/components/Graficos";
import { CargarBultos } from "./Cargar";
import { FiltroSemana } from "@/components/FiltroSemana";

type V = { id: number; nro_lpn: string; cod_alternat: string; descripcion: string | null; proceso: string | null; area: string | null; supervisor: string | null; usuario_causo: string | null; dni_causo: string | null;
  cantidad_actual: number | null; valor_total: number | null; semana_calc: string; unidades_recuperadas: number; unidades_pendientes: number; val_tot: number | null; valor_pendiente: number; estado: string; dias_demora: number; tramo: string; alerta: string | null; ubicacion: string | null };

export async function DashboardBultos({ clas, titulo, semana }: { clas: "perdidos" | "sin_ubicacion"; titulo: string; semana?: string }) {
  const supabase = await createClient();
  const { data: cl } = await supabase.auth.getClaims();
  const { data: perfil } = await supabase.from("perfil").select("rol").eq("id", cl?.claims?.sub ?? "").maybeSingle();
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
      {perfil?.rol === "admin" && <CargarBultos clas={clas} />}
      {error && <p className="rounded-xl bg-tarjeta p-4 text-sm text-marca-oscuro">{error.message}</p>}
      {!r.length ? <p className="rounded-xl bg-tarjeta p-6 text-sm text-suave">Aún no hay bultos cargados.</p> : (<>
        <Kpis items={[
          { t: "Bultos", v: fmtNum(r.length) }, { t: "Pendientes", v: fmtNum(abiertos.length), s: `${abiertos.filter((x) => x.estado === "parcial").length} parciales`, alerta: abiertos.length > 0 },
          { t: "Recuperados", v: fmtNum(r.filter((x) => x.estado === "recuperado").length) },
          { t: "Valor total", v: fmtSoles(valTot) }, { t: "Valor pendiente", v: fmtSoles(valPend), alerta: valPend > 0 },
          { t: "Ya no figuran", v: fmtNum(ya), s: "poner fecha de levantamiento", alerta: ya > 0 },
        ]} />
        <div className="grid gap-4 lg:grid-cols-2">
          <Barras titulo="Pendientes por tramo de demora" datos={agrupar(abiertos, (x) => x.tramo).sort((a, b) => a[0].localeCompare(b[0]))} />
          <Barras titulo="Estado" datos={agrupar(r, (x) => x.estado)} />
          <Barras titulo="Valor pendiente por área" datos={agrupar(abiertos, (x) => x.area, (x) => Number(x.valor_pendiente)).slice(0, 12)} fmt={fmtSoles} />
          <Barras titulo="Pendientes por supervisor" datos={agrupar(abiertos, (x) => x.supervisor).slice(0, 12)} />
          <Barras titulo="Usuarios que los causaron (bultos)" datos={agrupar(r, (x) => x.usuario_causo || x.dni_causo).slice(0, 12)} />
          <Barras titulo="Por proceso" datos={agrupar(r, (x) => x.proceso)} />
          <Barras titulo="Bultos por semana" datos={agrupar(r, (x) => x.semana_calc).sort((a, b) => a[0].localeCompare(b[0]))} />
        </div>
        <section className="rounded-xl bg-tarjeta p-5">
          <h2 className="mb-3 font-semibold">Pendientes más antiguos</h2>
          <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm">
            <thead className="text-left text-suave"><tr>{["Días", "LPN", "SKU", "Descripción", "Área", "Pend. und", "Valor pend.", "Estado", "Alerta"].map((h) => <th key={h} className="border-b border-borde px-2 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>{abiertos.sort((a, b) => b.dias_demora - a.dias_demora).slice(0, 100).map((x) => (
              <tr key={x.id} className="border-b border-borde">
                <td className="px-2 py-2 font-semibold tabular-nums">{x.dias_demora}</td><td className="px-2 py-2 font-mono text-xs">{x.nro_lpn}</td>
                <td className="px-2 py-2">{x.cod_alternat}</td><td className="max-w-56 truncate px-2 py-2">{x.descripcion}</td><td className="px-2 py-2">{x.area}</td>
                <td className="px-2 py-2 tabular-nums">{fmtNum(x.unidades_pendientes)}</td><td className="px-2 py-2 tabular-nums">{fmtSoles(Number(x.valor_pendiente))}</td>
                <td className="px-2 py-2">{x.estado}</td><td className="px-2 py-2 text-xs font-semibold text-marca">{x.alerta ?? ""}</td>
              </tr>))}</tbody></table></div>
        </section>
      </>)}
    </div>
  );
}
