import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fmtFecha, fmtNum } from "@/lib/formato";
import { CargarReabasto } from "./Cargar";

export const dynamic = "force-dynamic";

type T = {
  clave: string; fecha: string; dia: string; turno: string | null; nro_tarea: string; tipo_asignac: string | null; estado: string | null;
  seguimiento: string; horas_pendiente: number | null; cod_alternat: string; descripcion: string | null; cantidad: number;
  ubic_destino: string | null; area: string | null; usuario: string | null; motivo_seleccion: string | null; resultado: string | null;
  p1_ubic_correcta: string | null; p2_sin_mezcla: string | null; p3_cant_cuadra: string | null; p4_lote: string | null; p5_fefo: string | null; p6_pasillo_limpio: string | null;
  hallazgo_principal: string | null;
};
const RES: Record<string, string> = {
  CONFORME: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  "NO CONFORME": "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  "SIN EVALUAR": "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300",
  PENDIENTE: "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200",
};
const PUNTOS = [["p1_ubic_correcta", "P1 Ubicación correcta"], ["p2_sin_mezcla", "P2 Sin mezcla de SKU"], ["p3_cant_cuadra", "P3 Cantidad cuadra"],
  ["p4_lote", "P4 Lote"], ["p5_fefo", "P5 FEFO"], ["p6_pasillo_limpio", "P6 Pasillo limpio / LPN retirado"]] as const;

function Barras({ titulo, datos }: { titulo: string; datos: [string, number][] }) {
  const max = Math.max(1, ...datos.map(([, v]) => v));
  return (
    <section className="rounded-xl bg-tarjeta p-5">
      <h2 className="mb-4 font-semibold">{titulo}</h2>
      {!datos.length ? <p className="text-sm text-suave">Sin datos.</p> : (
        <ul className="flex flex-col gap-2.5">{datos.map(([k, v]) => (
          <li key={k} title={`${k}: ${fmtNum(v)}`} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm">
            <span className="truncate text-suave">{k}</span>
            <span className="h-3.5 rounded-r bg-texto/70 hover:bg-marca" style={{ width: `${(v / max) * 100}%` }} />
            <span className="tabular-nums">{fmtNum(v)}</span>
          </li>))}</ul>)}
    </section>
  );
}

export default async function ReabastoPage({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const { dia: dp } = await searchParams;
  const supabase = await createClient();
  const { data: cl } = await supabase.auth.getClaims();
  const { data: perfil } = await supabase.from("perfil").select("rol").eq("id", cl?.claims?.sub ?? "").maybeSingle();
  const { data: ds } = await supabase.from("v_tarea_reabasto").select("dia").order("dia", { ascending: false }).limit(5000);
  const dias = [...new Set((ds ?? []).map((d) => d.dia as string))];
  const dia = dp && dias.includes(dp) ? dp : dias[0];
  const { data, error } = dia ? await supabase.from("v_tarea_reabasto").select("*").eq("dia", dia).limit(20000) : { data: [], error: null };
  const t = (data ?? []) as T[];

  const fin = t.filter((x) => x.seguimiento === "FINALIZADA").length;
  const can = t.filter((x) => x.seguimiento === "CANCELADA").length;
  const pen = t.filter((x) => x.seguimiento === "PENDIENTE");
  const muestra = t.filter((x) => x.motivo_seleccion);
  const auditadas = muestra.filter((x) => x.resultado === "CONFORME" || x.resultado === "NO CONFORME");
  const conformes = auditadas.filter((x) => x.resultado === "CONFORME").length;
  const g = (xs: T[], k: (x: T) => string | null) => {
    const m = new Map<string, number>(); xs.forEach((x) => m.set(k(x) ?? "Sin dato", (m.get(k(x) ?? "Sin dato") ?? 0) + 1));
    return [...m].sort((a, b) => b[1] - a[1]);
  };
  const fallasPunto: [string, number][] = PUNTOS.map(([k, n]) => [n, auditadas.filter((x) => x[k] === "No").length] as [string, number]).filter(([, v]) => v > 0);

  const kpis = [
    { t: "Tareas programadas", v: fmtNum(t.length) },
    { t: "Finalizadas", v: t.length ? `${((fin / t.length) * 100).toFixed(1)}%` : "—", s: fmtNum(fin) },
    { t: "Canceladas", v: fmtNum(can) },
    { t: "Pendientes", v: fmtNum(pen.length), a: pen.length > 0 },
    { t: "Auditadas", v: `${auditadas.length} / ${muestra.length}`, s: "de la muestra" },
    { t: "% Conforme", v: auditadas.length ? `${((conformes / auditadas.length) * 100).toFixed(1)}%` : "—", a: auditadas.length > conformes },
  ];

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm text-suave">Seguimiento de operaciones</p><h1 className="text-2xl font-extrabold">Auditoría de reabasto</h1></div>
        {dias.length > 0 && (
          <form className="flex items-end gap-2">
            <label className="flex flex-col gap-1 text-xs text-suave">Día
              <select name="dia" defaultValue={dia} className="h-10 rounded-lg border border-borde bg-tarjeta px-2 text-sm text-texto">
                {dias.map((d) => <option key={d} value={d}>{fmtFecha(d + "T12:00:00-05:00")}</option>)}
              </select></label>
            <button className="h-10 rounded-lg border border-borde bg-tarjeta px-3 text-sm">Ver</button>
          </form>)}
      </header>
      {perfil?.rol === "admin" && <CargarReabasto />}
      {error && <p role="alert" className="rounded-xl bg-tarjeta p-4 text-sm text-marca-oscuro">{error.message}</p>}
      {!t.length ? <p className="rounded-xl bg-tarjeta p-6 text-sm text-suave">Aún no hay programación cargada.</p> : (<>
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {kpis.map((k) => (
            <div key={k.t} className="rounded-xl bg-tarjeta p-4">
              <p className="text-xs text-suave">{k.t}</p>
              <p className={`mt-1.5 text-xl font-bold ${k.a ? "text-marca" : ""}`}>{k.v}</p>
              {k.s && <p className="text-xs text-suave">{k.s}</p>}
            </div>))}
        </section>

        <section className="rounded-xl bg-tarjeta p-5">
          <h2 className="mb-3 font-semibold">Muestra de auditoría del día ({muestra.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-suave"><tr>{["Resultado", "Motivo", "Tarea", "SKU", "Descripción", "Destino", "Usuario", "Hallazgo", ""].map((h) => <th key={h} className="border-b border-borde px-2 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>{muestra.sort((a, b) => (a.resultado === "PENDIENTE" ? -1 : 1) - (b.resultado === "PENDIENTE" ? -1 : 1)).map((x) => (
                <tr key={x.clave} className="border-b border-borde">
                  <td className="px-2 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${RES[x.resultado ?? "PENDIENTE"]}`}>{x.resultado ?? "PENDIENTE"}</span></td>
                  <td className="px-2 py-2">{x.motivo_seleccion}</td>
                  <td className="px-2 py-2 font-mono text-xs">{x.nro_tarea}</td>
                  <td className="px-2 py-2">{x.cod_alternat}</td>
                  <td className="max-w-56 truncate px-2 py-2">{x.descripcion}</td>
                  <td className="px-2 py-2">{x.ubic_destino}</td>
                  <td className="px-2 py-2">{x.usuario}</td>
                  <td className="px-2 py-2">{x.hallazgo_principal ?? "—"}</td>
                  <td className="px-2 py-2"><Link href={`/operaciones/reabasto/auditar/${encodeURIComponent(x.clave)}`} className="font-semibold text-marca hover:underline">Auditar</Link></td>
                </tr>))}</tbody>
            </table>
          </div>
        </section>

        {pen.length > 0 && (
          <section className="rounded-xl bg-tarjeta p-5">
            <h2 className="mb-3 font-semibold">Tareas pendientes ({pen.length}) — más antiguas primero</h2>
            <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-suave"><tr>{["Horas", "Estado", "Tarea", "Tipo", "SKU", "Destino", "Usuario"].map((h) => <th key={h} className="border-b border-borde px-2 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>{pen.sort((a, b) => (b.horas_pendiente ?? 0) - (a.horas_pendiente ?? 0)).slice(0, 100).map((x) => (
                <tr key={x.clave} className="border-b border-borde">
                  <td className="px-2 py-2 font-semibold tabular-nums text-marca">{x.horas_pendiente} h</td><td className="px-2 py-2">{x.estado}</td>
                  <td className="px-2 py-2 font-mono text-xs">{x.nro_tarea}</td><td className="px-2 py-2">{x.tipo_asignac}</td>
                  <td className="px-2 py-2">{x.cod_alternat}</td><td className="px-2 py-2">{x.ubic_destino}</td><td className="px-2 py-2">{x.usuario ?? "—"}</td>
                </tr>))}</tbody></table></div>
          </section>)}

        <div className="grid gap-4 lg:grid-cols-2">
          <Barras titulo="Tareas por estado" datos={g(t, (x) => x.estado)} />
          <Barras titulo="Tareas por tipo de asignación" datos={g(t, (x) => x.tipo_asignac)} />
          <Barras titulo="Tareas por área de destino" datos={g(t, (x) => x.area).slice(0, 12)} />
          <Barras titulo="Tareas por turno" datos={g(t, (x) => x.turno)} />
          <Barras titulo="No conformidades por punto del checklist" datos={fallasPunto} />
          <Barras titulo="No conformes por usuario" datos={g(auditadas.filter((x) => x.resultado === "NO CONFORME"), (x) => x.usuario).slice(0, 10)} />
        </div>
      </>)}
    </div>
  );
}
