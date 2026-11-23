import { createClient } from "@/lib/supabase/server";
import { obtenerPermisos } from "@/lib/permisos";
import { fmtNum } from "@/lib/formato";
import { Barras, Kpis } from "@/components/Graficos";
import { CargarEru } from "./CargarEru";

export const dynamic = "force-dynamic";
type R = { mes: string; dia: string; semana: string; ubi: string | null; area: string | null; subarea: string | null; contadas: number; con_error: number };
type P = { descripcion: string; cod_alternat: string | null; area: string | null; faltante: number; sobrante: number };

const pct = (c: number, e: number) => (c ? 1 - e / c : 0);
const fp = (x: number) => `${(x * 100).toFixed(1)}%`;
function eruPor(r: R[], k: (x: R) => string | null) {
  const m = new Map<string, [number, number]>();
  r.forEach((x) => { const key = k(x) || "Sin dato"; const v = m.get(key) ?? [0, 0]; v[0] += x.contadas; v[1] += x.con_error; m.set(key, v); });
  return [...m].map(([key, [c, e]]) => [key, Math.round(pct(c, e) * 1000) / 10] as [string, number]);
}

export default async function Eru({ searchParams }: { searchParams: Promise<{ mes?: string; semana?: string; tipo?: string; area?: string }> }) {
  const sp = await searchParams;
  const s = await createClient();
  const { nivel } = await obtenerPermisos();
  const puedeCargar = nivel("/cargas") === "editar";
  const { data: ms } = await s.from("eru_resumen").select("mes").order("mes", { ascending: false }).limit(5000);
  const meses = [...new Set((ms ?? []).map((x) => x.mes as string))];
  const mes = sp.mes ?? meses[0] ?? "";
  const todo: R[] = [];
  for (let d = 0; mes; d += 1000) {
    const { data } = await s.from("eru_resumen").select("mes,dia,semana,ubi,area,subarea,contadas,con_error").eq("mes", mes).range(d, d + 999);
    todo.push(...((data ?? []) as R[])); if (!data || data.length < 1000) break;
  }
  const semanas = [...new Set(todo.map((x) => x.semana))].sort();
  const areas = [...new Set(todo.map((x) => x.area).filter(Boolean) as string[])].sort();
  const r = todo.filter((x) => (!sp.semana || x.semana === sp.semana) && (!sp.tipo || x.ubi === sp.tipo) && (!sp.area || x.area === sp.area));
  const sum = (a: R[]) => [a.reduce((t, x) => t + x.contadas, 0), a.reduce((t, x) => t + x.con_error, 0)] as const;
  const [c, e] = sum(r); const [ca, ea] = sum(r.filter((x) => x.ubi === "ACTIVO")); const [cr, er] = sum(r.filter((x) => x.ubi === "RESERVA"));
  const color = (x: number) => (x >= 0.98 ? "text-green-700" : x < 0.95 ? "text-marca" : "text-amber-600");

  let q = s.from("eru_producto").select("descripcion,cod_alternat,area,faltante,sobrante").eq("mes", mes);
  if (sp.semana) q = q.eq("semana", sp.semana); if (sp.tipo) q = q.eq("ubi", sp.tipo); if (sp.area) q = q.eq("area", sp.area);
  const { data: pr } = mes ? await q.limit(20000) : { data: [] };
  const prod = new Map<string, P>();
  ((pr ?? []) as P[]).forEach((x) => { const v = prod.get(x.descripcion) ?? { ...x, faltante: 0, sobrante: 0 }; v.faltante += Number(x.faltante); v.sobrante += Number(x.sobrante); prod.set(x.descripcion, v); });
  const top = [...prod.values()].sort((a, b) => b.faltante + b.sobrante - (a.faltante + a.sobrante)).slice(0, 15);
  const sel = "h-10 rounded-lg border border-borde bg-tarjeta px-2 text-sm text-texto";

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm text-suave">Control de inventario</p><h1 className="text-2xl font-extrabold">ERU / ERI</h1>
          <p className="text-xs text-suave">ERU = 1 − ubicaciones con error ÷ ubicaciones contadas · verde ≥ 98% · rojo &lt; 95%</p></div>
        <form className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-suave">Mes<select name="mes" defaultValue={mes} className={sel}>{meses.map((m) => <option key={m}>{m}</option>)}</select></label>
          <label className="flex flex-col gap-1 text-xs text-suave">Semana<select name="semana" defaultValue={sp.semana ?? ""} className={sel}><option value="">Todas</option>{semanas.map((m) => <option key={m}>{m}</option>)}</select></label>
          <label className="flex flex-col gap-1 text-xs text-suave">Tipo<select name="tipo" defaultValue={sp.tipo ?? ""} className={sel}><option value="">Todos</option><option>ACTIVO</option><option>RESERVA</option></select></label>
          <label className="flex flex-col gap-1 text-xs text-suave">Área<select name="area" defaultValue={sp.area ?? ""} className={sel}><option value="">Todas</option>{areas.map((m) => <option key={m}>{m}</option>)}</select></label>
          <button className="h-10 rounded-lg border border-borde bg-tarjeta px-3 text-sm">Ver</button>
        </form>
      </header>
      {puedeCargar && <CargarEru cargados={meses} />}
      {!todo.length ? <p className="rounded-xl bg-tarjeta p-6 text-sm text-suave">Aún no hay meses cargados. Sube el archivo ERU del mes.</p> : (<>
        <Kpis items={[
          { t: "ERU general", v: <span className={color(pct(c, e))}>{fp(pct(c, e))}</span> },
          { t: "Ubicaciones contadas", v: fmtNum(c) }, { t: "Con error", v: fmtNum(e), alerta: e > 0 },
          { t: "ERU ACTIVO", v: <span className={color(pct(ca, ea))}>{fp(pct(ca, ea))}</span>, s: `${fmtNum(ca)} contadas` },
          { t: "ERU RESERVA", v: <span className={color(pct(cr, er))}>{fp(pct(cr, er))}</span>, s: `${fmtNum(cr)} contadas` },
        ]} />
        <div className="grid gap-4 lg:grid-cols-2">
          <Barras titulo="ERU por área (%)" datos={eruPor(r, (x) => x.area).sort((a, b) => a[1] - b[1])} fmt={(n) => `${n}%`} />
          <Barras titulo="ERU por semana (%)" datos={eruPor(r, (x) => x.semana).sort((a, b) => a[0].localeCompare(b[0]))} fmt={(n) => `${n}%`} />
          <Barras titulo="ERU por subárea (%) · 15 más bajas" datos={eruPor(r, (x) => x.subarea).sort((a, b) => a[1] - b[1]).slice(0, 15)} fmt={(n) => `${n}%`} />
          <Barras titulo="ERU por día (%)" datos={eruPor(r, (x) => x.dia.slice(8, 10) + "/" + x.dia.slice(5, 7)).sort((a, b) => a[0].slice(3).localeCompare(b[0].slice(3)) || a[0].localeCompare(b[0]))} fmt={(n) => `${n}%`} />
        </div>
        <section className="rounded-xl bg-tarjeta p-5">
          <h2 className="mb-3 font-semibold">Top 15 productos con diferencias</h2>
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-suave"><tr>{["SKU", "Producto", "Área", "Faltante", "Sobrante"].map((h) => <th key={h} className="border-b border-borde px-2 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>{top.map((x) => (
              <tr key={x.descripcion} className="border-b border-borde"><td className="px-2 py-2">{x.cod_alternat ?? "—"}</td><td className="px-2 py-2">{x.descripcion}</td><td className="px-2 py-2">{x.area ?? "—"}</td>
                <td className="px-2 py-2 tabular-nums text-marca">{fmtNum(-x.faltante)}</td><td className="px-2 py-2 tabular-nums text-blue-700">+{fmtNum(x.sobrante)}</td></tr>))}</tbody></table></div>
        </section>
      </>)}
    </div>
  );
}
