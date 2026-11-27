import { createClient } from "@/lib/supabase/server";
import { obtenerPermisos } from "@/lib/permisos";
import { fmtNum } from "@/lib/formato";
import { Barras } from "@/components/Graficos";
import { Lineas } from "@/components/Lineas";
import { CargarUca } from "./Cargar";

export const dynamic = "force-dynamic";
type F = { k: string; a?: string; pos: number; oc: number; u?: number; pas?: number; p12?: number; o12?: number; p18?: number; o18?: number };
type D = { corte: string | null; posiciones: number; kpi: { pos: number; oc: number; u: number }; areas: F[] | null; pasillos: F[] | null; alturas: F[] | null; niveles: F[] | null;
  historial: { corte: string; pos: number; oc: number }[] | null; opciones: { areas: string[] | null; niveles: number[] | null } };
const pct = (oc: number, pos: number) => (pos ? (oc / pos) * 100 : 0);
const color = (p: number) => (p >= 85 ? "bg-red-600" : p >= 70 ? "bg-amber-500" : "bg-green-600");
const txt = (p: number) => (p >= 85 ? "text-red-600" : p >= 70 ? "text-amber-600" : "text-green-700 dark:text-green-400");

export default async function Uca({ searchParams }: { searchParams: Promise<{ area?: string; altura?: string; nivel?: string }> }) {
  const sp = await searchParams;
  const s = await createClient();
  const { nivel } = await obtenerPermisos();
  const { data } = await s.rpc("uca_dash", { p_area: sp.area || null, p_altura: sp.altura || null, p_nivel: sp.nivel ? Number(sp.nivel) : null });
  const d = data as D | null;
  const puede = nivel("/inventario/uca") === "editar";
  const k = d?.kpi ?? { pos: 0, oc: 0, u: 0 };
  const sel = "h-9 rounded-lg border border-borde bg-tarjeta px-2 text-sm text-texto";
  const th = "px-2 py-2 font-semibold text-right";
  const uca = (o?: number, p?: number) => (p ? <span className={`font-semibold ${txt(pct(o ?? 0, p))}`}>{pct(o ?? 0, p).toFixed(1)}%</span> : <span className="text-suave">—</span>);
  return (
    <div className="flex flex-col gap-5">
      <header><p className="text-sm text-suave">Control de inventario</p><h1 className="text-2xl font-extrabold">UCA almacén · por pasillo y altura</h1>
        <p className="text-sm text-suave">Reserva DA / CA / BA · 1 ubicación = 1 paleta · UCA = ocupadas ÷ posiciones · {d?.corte ? `WMS al ${new Date(d.corte).toLocaleString("es-PE", { timeZone: "America/Lima", dateStyle: "short", timeStyle: "short" })}` : "sin stock cargado"}</p></header>
      {puede && <CargarUca hayMaestro={!!d?.posiciones} />}
      {!d?.posiciones ? <p className="rounded-xl bg-tarjeta p-6 text-sm text-suave">Carga el maestro de posiciones para empezar.</p> : (<>
        <form className="flex flex-wrap items-end gap-2 rounded-xl bg-tarjeta p-3">
          <label className="flex flex-col gap-1 text-xs text-suave">Área<select name="area" defaultValue={sp.area ?? ""} className={sel}><option value="">Todas</option>{(d.opciones.areas ?? []).sort().map((a) => <option key={a}>{a}</option>)}</select></label>
          <label className="flex flex-col gap-1 text-xs text-suave">Altura<select name="altura" defaultValue={sp.altura ?? ""} className={sel}><option value="">Todas</option><option>1.20</option><option>1.80</option></select></label>
          <label className="flex flex-col gap-1 text-xs text-suave">Nivel<select name="nivel" defaultValue={sp.nivel ?? ""} className={sel}><option value="">Todos</option>{(d.opciones.niveles ?? []).sort((a, b) => a - b).map((n) => <option key={n}>{n}</option>)}</select></label>
          <button className="h-9 rounded-lg bg-marca px-4 text-sm font-semibold text-white">Ver</button>
        </form>
        <section className="grid grid-cols-2 overflow-hidden rounded-xl bg-tarjeta sm:grid-cols-5">
          {[["Posiciones (paletas)", fmtNum(k.pos), ""], ["Ocupadas", fmtNum(k.oc), ""], ["Libres", fmtNum(k.pos - k.oc), "text-green-700"], ["UCA %", `${pct(k.oc, k.pos).toFixed(1)}%`, txt(pct(k.oc, k.pos))], ["Unidades en stock", fmtNum(Number(k.u)), ""]].map(([t, v, c]) => (
            <div key={t} className="text-center"><p className="bg-grafito py-1 text-xs font-semibold text-white">{t}</p><p className={`py-3 text-xl font-bold tabular-nums ${c}`}>{v}</p></div>))}
        </section>
        <div className="grid gap-4 lg:grid-cols-2">
          <Barras titulo="UCA por área (%)" max={100} color={color} fmt={(n) => `${n.toFixed(1)}%`} datos={(d.areas ?? []).map((x) => [x.k, pct(x.oc, x.pos)] as [string, number])}
            enlace={(a) => `?${new URLSearchParams({ ...(sp.altura ? { altura: sp.altura } : {}), area: a })}`} leyenda={<><span>Verde &lt; 70%</span><span>Ámbar 70–85%</span><span>Rojo ≥ 85% (casi lleno)</span></>} />
          <Barras titulo="UCA por nivel (%)" max={100} color={color} fmt={(n) => `${n.toFixed(1)}%`} datos={(d.niveles ?? []).map((x) => [`Nivel ${x.k}`, pct(x.oc, x.pos)] as [string, number])} />
        </div>
        {(d.historial?.length ?? 0) > 1 && <Lineas titulo="Evolución de la UCA (%) por corte" min={0} series={["UCA"]} datos={(d.historial ?? []).map((h) => ({ x: `${h.corte.slice(8)}/${h.corte.slice(5, 7)}`, UCA: Math.round(pct(h.oc, h.pos) * 10) / 10 }))} />}
        <section className="rounded-xl bg-tarjeta p-5">
          <h2 className="mb-3 font-semibold text-marca">UCA por pasillo y altura</h2>
          <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-grafito text-white">
              <tr><th className="px-2 py-1" colSpan={2}></th><th className="px-2 py-1 text-center" colSpan={3}>ALTURA 1.20</th><th className="px-2 py-1 text-center" colSpan={3}>ALTURA 1.80</th><th className="px-2 py-1 text-center" colSpan={5}>TOTAL</th></tr>
              <tr><th className="px-2 py-2 text-left">Área</th><th className="px-2 py-2 text-left">Pasillo</th>{["Posiciones", "Ocupadas", "UCA", "Posiciones", "Ocupadas", "UCA", "Posiciones", "Ocupadas", "UCA", "Libres", "Unidades"].map((h, i) => <th key={i} className={th}>{h}</th>)}</tr></thead>
            <tbody>{(d.pasillos ?? []).map((x) => (
              <tr key={x.k} className="border-b border-borde text-right tabular-nums"><td className="px-2 py-1 text-left">{x.a}</td><td className="px-2 py-1 text-left font-semibold">{x.k}</td>
                <td className="px-2 py-1">{fmtNum(x.p12 ?? 0)}</td><td className="px-2 py-1">{fmtNum(x.o12 ?? 0)}</td><td className="px-2 py-1">{uca(x.o12, x.p12)}</td>
                <td className="px-2 py-1">{fmtNum(x.p18 ?? 0)}</td><td className="px-2 py-1">{fmtNum(x.o18 ?? 0)}</td><td className="px-2 py-1">{uca(x.o18, x.p18)}</td>
                <td className="px-2 py-1 font-semibold">{fmtNum(x.pos)}</td><td className="px-2 py-1">{fmtNum(x.oc)}</td>
                <td className="px-2 py-1"><span className="inline-flex items-center gap-1.5"><i className="inline-block h-2 w-12 rounded bg-fondo"><i className={`block h-2 rounded ${color(pct(x.oc, x.pos))}`} style={{ width: `${pct(x.oc, x.pos)}%` }} /></i>{uca(x.oc, x.pos)}</span></td>
                <td className="px-2 py-1 text-green-700">{fmtNum(x.pos - x.oc)}</td><td className="px-2 py-1">{fmtNum(Number(x.u ?? 0))}</td></tr>))}
              <tr className="bg-fondo text-right font-bold tabular-nums"><td className="px-2 py-1.5 text-left" colSpan={2}>TOTAL</td>
                {(() => { const P = d.pasillos ?? []; const s = (f: keyof F) => P.reduce((t, x) => t + Number(x[f] ?? 0), 0); return <>
                  <td className="px-2 py-1.5">{fmtNum(s("p12"))}</td><td className="px-2 py-1.5">{fmtNum(s("o12"))}</td><td className="px-2 py-1.5">{uca(s("o12"), s("p12"))}</td>
                  <td className="px-2 py-1.5">{fmtNum(s("p18"))}</td><td className="px-2 py-1.5">{fmtNum(s("o18"))}</td><td className="px-2 py-1.5">{uca(s("o18"), s("p18"))}</td>
                  <td className="px-2 py-1.5">{fmtNum(s("pos"))}</td><td className="px-2 py-1.5">{fmtNum(s("oc"))}</td><td className="px-2 py-1.5">{uca(s("oc"), s("pos"))}</td>
                  <td className="px-2 py-1.5">{fmtNum(s("pos") - s("oc"))}</td><td className="px-2 py-1.5">{fmtNum(s("u"))}</td></>; })()}</tr>
            </tbody></table></div>
        </section>
      </>)}
    </div>
  );
}
