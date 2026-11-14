import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fmtFecha, fmtNum } from "@/lib/formato";
import { BLOQUES_5S, nivel5S } from "@/lib/reglas/cincoS";

export const dynamic = "force-dynamic";

type R = {
  id: number; fecha: string; area: string; ubicacion: string | null; turno: string | null; supervisor: string | null; nombre_auditor: string | null;
  respuestas: Record<string, string>; pct_s1: number | null; pct_s2: number | null; pct_s3: number | null; pct_s4: number | null; pct_s5: number | null;
  pct_total: number | null; nivel: string | null; hallazgos: string | null; accion_correctiva: string | null; fotos: string[] | null;
};
const NIVEL_C: Record<string, string> = {
  EXCELENTE: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  BUENO: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  REGULAR: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300",
  DEFICIENTE: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};
const prom = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x != null).map(Number); return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null; };
const semanaISO = (d: string) => {
  const f = new Date(d + "T12:00:00Z"); const dia = (f.getUTCDay() + 6) % 7; f.setUTCDate(f.getUTCDate() - dia + 3);
  const y = f.getUTCFullYear(); const p = new Date(Date.UTC(y, 0, 4)); return `${y}-S${String(1 + Math.round(((f.getTime() - p.getTime()) / 864e5 - 3 + ((p.getUTCDay() + 6) % 7)) / 7)).padStart(2, "0")}`;
};

function Barras({ titulo, datos, sufijo = "%" }: { titulo: string; datos: [string, number | null][]; sufijo?: string }) {
  return (
    <section className="rounded-xl bg-tarjeta p-5">
      <h2 className="mb-4 font-semibold">{titulo}</h2>
      {!datos.length ? <p className="text-sm text-suave">Sin datos.</p> : (
        <ul className="flex flex-col gap-2.5">{datos.map(([k, v]) => (
          <li key={k} title={`${k}: ${v ?? "—"}${sufijo}`} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm">
            <span className="truncate text-suave">{k}</span>
            <span className="relative h-3.5 rounded-r bg-fondo">
              <span className="absolute inset-y-0 left-0 rounded-r bg-texto/70" style={{ width: `${Math.min(100, v ?? 0)}%` }} />
            </span>
            <span className="w-14 text-right tabular-nums">{v ?? "—"}{sufijo}</span>
          </li>))}</ul>)}
    </section>
  );
}

export default async function CincoS({ searchParams }: { searchParams: Promise<{ area?: string; desde?: string; hasta?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  let q = supabase.from("auditoria_5s").select("*").order("fecha", { ascending: false }).order("creado_en", { ascending: false }).limit(2000);
  if (sp.area) q = q.eq("area", sp.area);
  if (sp.desde) q = q.gte("fecha", sp.desde);
  if (sp.hasta) q = q.lte("fecha", sp.hasta);
  const { data, error } = await q;
  const { data: todasAreas } = await supabase.from("auditoria_5s").select("area").limit(2000);
  const areas = [...new Set((todasAreas ?? []).map((a) => a.area as string))].sort();
  const r = (data ?? []) as R[];

  const total = prom(r.map((x) => x.pct_total));
  const porS = [1, 2, 3, 4, 5].map((s) => prom(r.map((x) => x[`pct_s${s}` as keyof R] as number | null)));
  const porNivel = ["EXCELENTE", "BUENO", "REGULAR", "DEFICIENTE"].map((n) => [n, r.filter((x) => x.nivel === n).length] as const);
  const agrupar = (k: (x: R) => string) => {
    const m = new Map<string, number[]>(); r.forEach((x) => { if (x.pct_total != null) m.set(k(x), [...(m.get(k(x)) ?? []), Number(x.pct_total)]); });
    return [...m].map(([a, v]) => [a, prom(v)] as [string, number | null]);
  };
  const porArea = agrupar((x) => x.area).sort((a, b) => (a[1] ?? 0) - (b[1] ?? 0));
  const porSemana = agrupar((x) => semanaISO(x.fecha)).sort((a, b) => a[0].localeCompare(b[0])).slice(-12);
  const items = BLOQUES_5S.flatMap((b) => b.items);
  const fallas = items.map(([id, txt]) => {
    const ev = r.filter((x) => x.respuestas?.[id] && x.respuestas[id] !== "N.A.");
    const no = ev.filter((x) => x.respuestas[id] === "No cumple").length;
    const par = ev.filter((x) => x.respuestas[id] === "Parcial").length;
    return { id, txt, no, par, pct: ev.length ? Math.round(((no + par * 0.5) / ev.length) * 1000) / 10 : 0 };
  }).filter((f) => f.no + f.par > 0).sort((a, b) => b.pct - a.pct).slice(0, 8);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm text-suave">Control de inventario</p><h1 className="text-2xl font-extrabold">Cumplimiento 5S</h1></div>
        <form className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-suave">Área
            <select name="area" defaultValue={sp.area ?? ""} className="h-10 rounded-lg border border-borde bg-tarjeta px-2 text-sm text-texto">
              <option value="">Todas</option>{areas.map((a) => <option key={a}>{a}</option>)}</select></label>
          <label className="flex flex-col gap-1 text-xs text-suave">Desde<input type="date" name="desde" defaultValue={sp.desde} className="h-10 rounded-lg border border-borde bg-tarjeta px-2 text-sm text-texto" /></label>
          <label className="flex flex-col gap-1 text-xs text-suave">Hasta<input type="date" name="hasta" defaultValue={sp.hasta} className="h-10 rounded-lg border border-borde bg-tarjeta px-2 text-sm text-texto" /></label>
          <button className="h-10 rounded-lg border border-borde bg-tarjeta px-3 text-sm">Filtrar</button>
        </form>
      </header>
      {error && <p role="alert" className="rounded-xl bg-tarjeta p-4 text-sm text-marca-oscuro">{error.message}</p>}

      {!r.length ? (
        <div className="rounded-xl bg-tarjeta p-6 text-sm text-suave">
          Aún no hay auditorías 5S registradas. <Link href="/inventario/5s/auditar" className="font-semibold text-marca underline">Registrar la primera</Link>.
        </div>
      ) : (<>
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-xl bg-tarjeta p-4"><p className="text-xs text-suave">Auditorías</p><p className="mt-1.5 text-xl font-bold">{fmtNum(r.length)}</p></div>
          <div className="rounded-xl bg-tarjeta p-4"><p className="text-xs text-suave">Cumplimiento promedio</p><p className="mt-1.5 text-xl font-bold">{total ?? "—"}%</p><p className="text-xs text-suave">{nivel5S(total) ?? ""}</p></div>
          {porNivel.map(([n, c]) => (
            <div key={n} className="rounded-xl bg-tarjeta p-4"><p className="text-xs text-suave">{n}</p><p className="mt-1.5 text-xl font-bold">{c}</p></div>))}
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <Barras titulo="Cumplimiento promedio por S" datos={BLOQUES_5S.map((b, i) => [`${b.s}S ${b.nombre.split(" ")[0]}`, porS[i]])} />
          <Barras titulo="Cumplimiento por área (menor a mayor)" datos={porArea} />
          <Barras titulo="Evolución semanal" datos={porSemana} />
          <section className="rounded-xl bg-tarjeta p-5">
            <h2 className="mb-3 font-semibold">Ítems con más incumplimiento</h2>
            {!fallas.length ? <p className="text-sm text-suave">Sin incumplimientos.</p> : (
              <ul className="flex flex-col gap-2 text-sm">{fallas.map((f) => (
                <li key={f.id} className="flex items-start justify-between gap-3 border-b border-borde pb-2">
                  <span><b>{f.id}</b> {f.txt}</span>
                  <span className="shrink-0 text-right text-xs text-suave"><b className="text-marca">{f.no}</b> no cumple · {f.par} parcial</span>
                </li>))}</ul>)}
          </section>
        </div>

        <section className="rounded-xl bg-tarjeta p-5">
          <h2 className="mb-3 font-semibold">Base de auditorías ({r.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="text-left text-suave"><tr>{["Fecha", "Área", "Zona", "Auditor", "Supervisor", "1S", "2S", "3S", "4S", "5S", "Total", "Nivel", "Hallazgos", "Fotos"].map((h) => <th key={h} className="border-b border-borde px-2 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>{r.map((x) => (
                <tr key={x.id} className="border-b border-borde align-top">
                  <td className="px-2 py-2 whitespace-nowrap">{fmtFecha(x.fecha + "T12:00:00-05:00")}</td>
                  <td className="px-2 py-2">{x.area}</td><td className="px-2 py-2">{x.ubicacion ?? "—"}</td>
                  <td className="px-2 py-2">{x.nombre_auditor ?? "—"}</td><td className="px-2 py-2">{x.supervisor ?? "—"}</td>
                  {[x.pct_s1, x.pct_s2, x.pct_s3, x.pct_s4, x.pct_s5].map((p, i) => <td key={i} className="px-2 py-2 tabular-nums">{p ?? "—"}</td>)}
                  <td className="px-2 py-2 font-bold tabular-nums">{x.pct_total ?? "—"}%</td>
                  <td className="px-2 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${NIVEL_C[x.nivel ?? ""] ?? ""}`}>{x.nivel ?? "—"}</span></td>
                  <td className="max-w-64 px-2 py-2 text-xs">{x.hallazgos ?? "—"}{x.accion_correctiva && <><br /><span className="text-suave">Acción: {x.accion_correctiva}</span></>}</td>
                  <td className="px-2 py-2">{x.fotos?.length ?? 0}</td>
                </tr>))}</tbody>
            </table>
          </div>
        </section>
      </>)}
    </div>
  );
}
