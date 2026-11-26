import { createClient } from "@/lib/supabase/server";
import { fmtNum } from "@/lib/formato";
import { Barras, Kpis } from "@/components/Graficos";
import { Lineas } from "@/components/Lineas";

export const dynamic = "force-dynamic";
type R = { mes: string; dia: string; semana: string; ubi: string | null; area: string | null; subarea: string | null; pasillo: string | null; nivel: string | null; contadas: number; con_error: number };

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
  const { data: ms } = await s.from("eru_resumen").select("mes").order("mes", { ascending: false }).limit(5000);
  const meses = [...new Set((ms ?? []).map((x) => x.mes as string))];
  const mes = sp.mes ?? "";
  const todo: R[] = [];
  for (let d = 0; meses.length; d += 1000) {
    let q0 = s.from("eru_resumen").select("mes,dia,semana,ubi,area,subarea,pasillo,nivel,contadas,con_error").order("id").range(d, d + 999);
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

  const mk = () => { let q = s.from("eru_producto").select("dia,ubi,descripcion,area,faltante,sobrante");
    if (mes) q = q.eq("mes", mes); if (sp.semana) q = q.eq("semana", sp.semana); if (sp.tipo) q = q.eq("ubi", sp.tipo); if (sp.area) q = q.eq("area", sp.area); return q; };
  const neta = new Map<string, number>();
  const pr: { dia: string; ubi: string | null; descripcion: string; area: string | null; faltante: number; sobrante: number }[] = [];
  const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];
  for (let d = 0; meses.length; d += 1000) { const { data } = await mk().order("id").range(d, d + 999); pr.push(...(data ?? [])); if (!data || data.length < 1000 || pr.length >= 100000) break; }
  const prod = new Map<string, { dias: Set<string>; f: number; so: number; areas: Map<string, number> }>();
  pr.forEach((x) => { neta.set(x.descripcion, (neta.get(x.descripcion) ?? 0) + Number(x.faltante) - Number(x.sobrante)); if (x.ubi === "RESERVA") return; const v = prod.get(x.descripcion) ?? { dias: new Set(), f: 0, so: 0, areas: new Map() }; v.dias.add(x.dia); v.f += Number(x.faltante); v.so += Number(x.sobrante); if (x.area) v.areas.set(x.area, (v.areas.get(x.area) ?? 0) + 1); prod.set(x.descripcion, v); });
  const top = [...prod].map(([d, v]) => ({ d, n: v.dias.size, f: v.f, so: v.so, area: [...v.areas].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—" })).sort((a, b) => b.n - a.n).slice(0, 15);

  const perdida = [...neta].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 15);
  const serie = (k: (x: R) => string, etq: (k: string) => string = (x) => x) => eruPor(r, k).sort((a, b) => a[0].localeCompare(b[0])).map(([x, v]) => ({ x: etq(x), ERU: v }));
  const semaforo = (v: number) => (v >= 98 ? "bg-green-600" : v >= 95 ? "bg-amber-400" : "bg-red-600");

  // Cuadros por zona: RESERVA como una fila, áreas de ACTIVO, ACTIVO TOTAL y TOTAL CD
  const zona = (x: R) => (x.ubi === "RESERVA" ? "RESERVA" : x.area || "ACTIVO");
  const zonas = ["RESERVA", ...[...new Set(r.filter((x) => x.ubi !== "RESERVA").map(zona))].sort()];
  const filasZona = [...zonas.map((z) => [z, (x: R) => zona(x) === z] as const), ["ACTIVO TOTAL", (x: R) => x.ubi !== "RESERVA"] as const, ["TOTAL CD", () => true] as const];
  const dias = [...new Set(r.map((x) => x.dia))].sort().slice(-7);
  const sems = [...new Set(r.map((x) => x.semana))].sort().slice(-8);
  const celda = (a: R[]) => { const [cc, ee] = sum(a); return cc ? pct(cc, ee) : null; };
  const flecha = (v: number | null) => (v == null ? "" : `${v >= 0.95 ? "▲" : v >= 0.85 ? "►" : "▼"} ${fp(v)}`);
  const colorF = (v: number | null) => (v == null ? "" : v >= 0.95 ? "text-green-700 dark:text-green-400" : v >= 0.85 ? "text-amber-600" : "text-marca");
  const cuadro = (titulo: string, nota: string | null, cols: string[], porCol: (x: R, c: string) => boolean, modo: "eru" | "cont", total = true) => { const maxCont = Math.max(1, ...zonas.filter((z) => z !== "RESERVA").flatMap((z) => cols.map((c) => sum(r.filter((x) => zona(x) === z && porCol(x, c)))[0]))); return (
    <section className="rounded-xl bg-tarjeta p-5">
      <h2 className="font-semibold text-marca">{titulo}</h2>{nota && <p className="text-xs text-suave">{nota}</p>}
      <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[720px] text-sm">
        <thead className="bg-grafito text-white"><tr><th className="px-2 py-2 text-left font-semibold">Zona</th>{cols.map((c) => <th key={c} className="px-2 py-2 text-right font-semibold">{c.length === 10 ? `${c.slice(8)}/${c.slice(5, 7)}` : c}</th>)}{total && <th className="px-2 py-2 text-right font-semibold">Total periodo</th>}</tr></thead>
        <tbody>{filasZona.map(([z, f]) => { const rz = r.filter(f); const tot = z === "ACTIVO TOTAL" || z === "TOTAL CD";
          const val = (a: R[]) => { if (modo === "cont") { const n = sum(a)[0]; return <span className={!n || tot || z === "RESERVA" ? "" : n < 50 ? "text-red-600" : "text-green-700 dark:text-green-400"}>{n ? fmtNum(n) : ""}</span>; } const v = celda(a); return <span className={colorF(v)}>{flecha(v)}</span>; };
          return <tr key={z} className={`border-b border-borde ${tot || z === "RESERVA" ? "bg-fondo font-bold" : ""}`}><td className="px-2 py-1.5">{z}</td>
            {cols.map((c) => { const a = rz.filter((x) => porCol(x, c)); const n = sum(a)[0];
              const bg = modo !== "cont" || !n || tot || z === "RESERVA" ? undefined : n < 50 ? "rgba(239,68,68,0.15)" : `rgba(59,130,246,${(0.45 * n) / maxCont})`;
              return <td key={c} className="px-2 py-1.5 text-right tabular-nums" style={{ background: bg }}>{val(a)}</td>; })}
            {total && <td className="px-2 py-1.5 text-right tabular-nums">{val(rz)}</td>}</tr>; })}</tbody></table></div>
    </section>); };

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
      {!todo.length ? <p className="rounded-xl bg-tarjeta p-6 text-sm text-suave">Aún no hay meses cargados. Sube el archivo ERU del mes.</p> : (<>
        <Kpis items={[
          { t: "ERU general", v: <span className={color(pct(c, e))}>{fp(pct(c, e))}</span> },
          { t: "Ubicaciones contadas", v: fmtNum(c) }, { t: "Con error", v: fmtNum(e), alerta: e > 0 },
          { t: "ERU ACTIVO", v: <span className={color(pct(ca, ea))}>{fp(pct(ca, ea))}</span>, s: `${fmtNum(ca)} contadas` },
          { t: "ERU RESERVA", v: <span className={color(pct(cr, er))}>{fp(pct(cr, er))}</span>, s: `${fmtNum(cr)} contadas` },
        ]} />
        <div className="grid gap-4 lg:grid-cols-2">
          <Lineas titulo="ERU por mes" etiquetas datos={serie((x) => x.mes, (m) => MESES[Number(m.slice(5)) - 1])} series={["ERU"]} />
          <Lineas titulo="ERU por semana" etiquetas datos={serie((x) => x.semana)} series={["ERU"]} />
          <Lineas titulo="ERU por día" datos={serie((x) => x.dia, (d) => `${d.slice(8)}/${d.slice(5, 7)}`)} series={["ERU"]} min={0} />
          <Barras titulo="Pérdida neta por producto (top 15)" datos={perdida} />
          <Barras titulo="ERU por área · toca un área para ver su detalle" enlace={(k) => `?${new URLSearchParams({ ...(mes ? { mes } : {}), area: k })}`} max={100} datos={eruPor(r.filter((x) => x.area), (x) => x.area).sort((a, b) => a[1] - b[1])} fmt={(n) => `${n.toFixed(1)}%`} color={semaforo}
            leyenda={<><span className="flex items-center gap-1"><i className="inline-block h-3 w-3 bg-red-600" />Menor a 95%</span><span className="flex items-center gap-1"><i className="inline-block h-3 w-3 bg-amber-400" />Entre 95% y 98%</span><span className="flex items-center gap-1"><i className="inline-block h-3 w-3 bg-green-600" />Desde 98%</span></>} />
          <Barras titulo="Productos con más incidencias ERU (top 15)" datos={top.map((x) => [x.d, x.n] as [string, number])} color={() => "bg-red-600"} />
        </div>
        {sp.area && (() => {
          const mz = /^MEZZ/i.test(sp.area);
          const etiqueta = (n: string | null) => (!n ? "Sin nivel" : mz && /^\d+$/.test(n) ? `Piso ${Math.floor(Number(n) / 10)}` : `Nivel ${n}`);
          const conNivel = r.filter((x) => x.nivel || x.pasillo);
          return (
            <section className="rounded-xl bg-tarjeta p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-marca">Detalle de {sp.area}</h2>
                <a href={`?${new URLSearchParams(mes ? { mes } : {})}`} className="text-sm text-suave underline">Quitar filtro de área</a>
              </div>
              {!conNivel.length ? <p className="text-sm text-suave">Este mes aún no tiene detalle por pasillo y nivel. Vuelve a cargar el archivo ERU del mes para verlo.</p> : (
                <div className="grid gap-4 lg:grid-cols-2">
                  <Barras titulo={mz ? "ERU por piso" : "ERU por nivel del rack"} max={100} color={semaforo} fmt={(n) => `${n.toFixed(1)}%`}
                    datos={eruPor(conNivel, (x) => etiqueta(x.nivel)).sort((a, b) => a[0].localeCompare(b[0], "es", { numeric: true }))} />
                  <Barras titulo="ERU por pasillo (más bajos primero)" max={100} color={semaforo} fmt={(n) => `${n.toFixed(1)}%`}
                    datos={eruPor(conNivel, (x) => (x.pasillo ? `Pasillo ${x.pasillo}` : "Sin pasillo")).sort((a, b) => a[1] - b[1]).slice(0, 20)} />
                </div>)}
            </section>);
        })()}
        <section className="rounded-xl bg-tarjeta p-5">
          <h2 className="mb-3 font-semibold">Productos con más incidencias <span className="text-xs font-normal text-suave">(días con error de ubicación, sin reservas) · según filtros</span></h2>
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-suave"><tr>{["Producto", "Incidencias", "Und falt.", "Und sobr.", "Área"].map((h) => <th key={h} className="border-b border-borde px-2 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>{top.map((x) => (
              <tr key={x.d} className="border-b border-borde"><td className="px-2 py-1.5">{x.d}</td><td className="px-2 py-1.5 text-right font-bold tabular-nums" style={{ background: `rgba(239,68,68,${(0.6 * x.n) / Math.max(1, top[0]?.n ?? 1)})` }}>{x.n}</td>
                <td className="px-2 py-1.5 tabular-nums text-marca">{fmtNum(x.f)}</td><td className="px-2 py-1.5 tabular-nums text-blue-700">{fmtNum(x.so)}</td><td className="px-2 py-1.5">{x.area}</td></tr>))}</tbody></table></div>
        </section>
        {cuadro("Evolutivo ERU por zona · últimos 7 días del filtro", "▲ ≥95%  ► 85–95%  ▼ <85%", dias, (x, c) => x.dia === c, "eru")}
        <Lineas titulo="ERU diario por zona (últimos 7 días del filtro)" min={0} destacar="TOTAL CD"
          series={[...zonas.filter((z) => z !== "RESERVA").map((z) => [z, sum(r.filter((x) => zona(x) === z && dias.includes(x.dia)))[0]] as const).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([z]) => z), "TOTAL CD"]}
          datos={dias.map((d) => { const o: Record<string, string | number | null> = { x: `${d.slice(8)}/${d.slice(5, 7)}` };
            for (const [z, f] of filasZona) { const v = celda(r.filter((x) => f(x) && x.dia === d)); o[z] = v == null ? null : Math.round(v * 1000) / 10; } return o; })} />
        {cuadro("Ubicaciones contadas por zona y día · mismos días del cuadro anterior", "La cantidad contada cambia mucho entre días y zonas: el ERU diario no es comparable para medir mejora. Usar semanal o total del periodo.", dias, (x, c) => x.dia === c, "cont")}
        {cuadro("Evolutivo ERU por zona · por semana (últimas 8 semanas)", "▲ ≥95%  ► 85–95%  ▼ <85%", sems, (x, c) => x.semana === c, "eru", false)}
        {cuadro("Ubicaciones contadas por zona · por semana", null, sems, (x, c) => x.semana === c, "cont", false)}
      </>)}
    </div>
  );
}
