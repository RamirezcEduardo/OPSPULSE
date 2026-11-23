import { createClient } from "@/lib/supabase/server";
import { obtenerPermisos } from "@/lib/permisos";
import { fmtNum } from "@/lib/formato";
import { Barras, Kpis } from "@/components/Graficos";
import { CargarEru } from "./CargarEru";

export const dynamic = "force-dynamic";
type R = { mes: string; dia: string; semana: string; ubi: string | null; area: string | null; subarea: string | null; contadas: number; con_error: number };

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
  const mes = sp.mes ?? "";
  const todo: R[] = [];
  for (let d = 0; meses.length; d += 1000) {
    let q0 = s.from("eru_resumen").select("mes,dia,semana,ubi,area,subarea,contadas,con_error").order("id").range(d, d + 999);
    if (mes) q0 = q0.eq("mes", mes);
    const { data } = await q0;
    todo.push(...((data ?? []) as R[])); if (!data || data.length < 1000) break;
  }
  const semanas = [...new Set(todo.map((x) => x.semana))].sort();
  const areas = [...new Set(todo.map((x) => x.area).filter(Boolean) as string[])].sort();
  const r = todo.filter((x) => (!sp.semana || x.semana === sp.semana) && (!sp.tipo || x.ubi === sp.tipo) && (!sp.area || x.area === sp.area));
  const sum = (a: R[]) => [a.reduce((t, x) => t + x.contadas, 0), a.reduce((t, x) => t + x.con_error, 0)] as const;
  const [c, e] = sum(r); const [ca, ea] = sum(r.filter((x) => x.ubi === "ACTIVO")); const [cr, er] = sum(r.filter((x) => x.ubi === "RESERVA"));
  const color = (x: number) => (x >= 0.98 ? "text-green-700" : x < 0.95 ? "text-marca" : "text-amber-600");

  const mk = () => { let q = s.from("eru_producto").select("dia,descripcion,area,faltante,sobrante").neq("ubi", "RESERVA");
    if (mes) q = q.eq("mes", mes); if (sp.semana) q = q.eq("semana", sp.semana); if (sp.tipo) q = q.eq("ubi", sp.tipo); if (sp.area) q = q.eq("area", sp.area); return q; };
  const pr: { dia: string; descripcion: string; area: string | null; faltante: number; sobrante: number }[] = [];
  for (let d = 0; meses.length; d += 1000) { const { data } = await mk().order("id").range(d, d + 999); pr.push(...(data ?? [])); if (!data || data.length < 1000 || pr.length >= 100000) break; }
  const prod = new Map<string, { dias: Set<string>; f: number; so: number; areas: Map<string, number> }>();
  pr.forEach((x) => { const v = prod.get(x.descripcion) ?? { dias: new Set(), f: 0, so: 0, areas: new Map() }; v.dias.add(x.dia); v.f += Number(x.faltante); v.so += Number(x.sobrante); if (x.area) v.areas.set(x.area, (v.areas.get(x.area) ?? 0) + 1); prod.set(x.descripcion, v); });
  const top = [...prod].map(([d, v]) => ({ d, n: v.dias.size, f: v.f, so: v.so, area: [...v.areas].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—" })).sort((a, b) => b.n - a.n).slice(0, 15);

  // Cuadros por zona: RESERVA como una fila, áreas de ACTIVO, ACTIVO TOTAL y TOTAL CD
  const zona = (x: R) => (x.ubi === "RESERVA" ? "RESERVA" : x.area || "ACTIVO");
  const zonas = ["RESERVA", ...[...new Set(r.filter((x) => x.ubi !== "RESERVA").map(zona))].sort()];
  const filasZona = [...zonas.map((z) => [z, (x: R) => zona(x) === z] as const), ["ACTIVO TOTAL", (x: R) => x.ubi !== "RESERVA"] as const, ["TOTAL CD", () => true] as const];
  const dias = [...new Set(r.map((x) => x.dia))].sort().slice(-7);
  const sems = [...new Set(r.map((x) => x.semana))].sort().slice(-8);
  const celda = (a: R[]) => { const [cc, ee] = sum(a); return cc ? pct(cc, ee) : null; };
  const flecha = (v: number | null) => (v == null ? "" : `${v >= 0.95 ? "▲" : v >= 0.85 ? "►" : "▼"} ${fp(v)}`);
  const colorF = (v: number | null) => (v == null ? "" : v >= 0.95 ? "text-green-700 dark:text-green-400" : v >= 0.85 ? "text-amber-600" : "text-marca");
  const cuadro = (titulo: string, nota: string | null, cols: string[], porCol: (x: R, c: string) => boolean, modo: "eru" | "cont", total = true) => (
    <section className="rounded-xl bg-tarjeta p-5">
      <h2 className="font-semibold">{titulo}</h2>{nota && <p className="text-xs text-suave">{nota}</p>}
      <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[720px] text-sm">
        <thead className="text-left text-suave"><tr><th className="border-b border-borde px-2 py-2 font-medium">Zona</th>{cols.map((c) => <th key={c} className="border-b border-borde px-2 py-2 text-right font-medium">{c.length === 10 ? `${c.slice(8)}/${c.slice(5, 7)}` : c}</th>)}{total && <th className="border-b border-borde px-2 py-2 text-right font-medium">Total periodo</th>}</tr></thead>
        <tbody>{filasZona.map(([z, f]) => { const rz = r.filter(f); const tot = z === "ACTIVO TOTAL" || z === "TOTAL CD";
          const val = (a: R[]) => { if (modo === "cont") { const n = sum(a)[0]; return <span>{n ? fmtNum(n) : ""}</span>; } const v = celda(a); return <span className={colorF(v)}>{flecha(v)}</span>; };
          return <tr key={z} className={`border-b border-borde ${tot ? "font-bold" : ""}`}><td className="px-2 py-1.5">{z}</td>
            {cols.map((c) => <td key={c} className="px-2 py-1.5 text-right tabular-nums">{val(rz.filter((x) => porCol(x, c)))}</td>)}
            {total && <td className="px-2 py-1.5 text-right tabular-nums">{val(rz)}</td>}</tr>; })}</tbody></table></div>
    </section>);

  const sel = "h-10 rounded-lg border border-borde bg-tarjeta px-2 text-sm text-texto";

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm text-suave">Control de inventario</p><h1 className="text-2xl font-extrabold">Exactitud de Registro de Ubicaciones (ERU)</h1>
          <p className="text-xs text-suave">ERU = 1 − ubicaciones con error ÷ ubicaciones contadas · verde ≥ 98% · rojo &lt; 95%</p></div>
        <form className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-suave">Mes<select name="mes" defaultValue={mes} className={sel}><option value="">Todos</option>{meses.map((m) => <option key={m}>{m}</option>)}</select></label>
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
        </div>
        <section className="rounded-xl bg-tarjeta p-5">
          <h2 className="mb-3 font-semibold">Productos con más incidencias <span className="text-xs font-normal text-suave">(días con error de ubicación, sin reservas) · según filtros</span></h2>
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-suave"><tr>{["Producto", "Incidencias", "Und falt.", "Und sobr.", "Área"].map((h) => <th key={h} className="border-b border-borde px-2 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>{top.map((x) => (
              <tr key={x.d} className="border-b border-borde"><td className="px-2 py-1.5">{x.d}</td><td className="px-2 py-1.5 font-bold tabular-nums">{x.n}</td>
                <td className="px-2 py-1.5 tabular-nums text-marca">{fmtNum(x.f)}</td><td className="px-2 py-1.5 tabular-nums text-blue-700">{fmtNum(x.so)}</td><td className="px-2 py-1.5">{x.area}</td></tr>))}</tbody></table></div>
        </section>
        {cuadro("Evolutivo ERU por zona · últimos 7 días del filtro", "▲ ≥95%  ► 85–95%  ▼ <85%", dias, (x, c) => x.dia === c, "eru")}
        {cuadro("Ubicaciones contadas por zona y día · mismos días del cuadro anterior", "La cantidad contada cambia mucho entre días y zonas: el ERU diario no es comparable para medir mejora. Usar semanal o total del periodo.", dias, (x, c) => x.dia === c, "cont")}
        {cuadro("Evolutivo ERU por zona · por semana (últimas 8 semanas)", "▲ ≥95%  ► 85–95%  ▼ <85%", sems, (x, c) => x.semana === c, "eru", false)}
        {cuadro("Ubicaciones contadas por zona · por semana", null, sems, (x, c) => x.semana === c, "cont", false)}
      </>)}
    </div>
  );
}
