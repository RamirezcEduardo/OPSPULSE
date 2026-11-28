import { createClient } from "@/lib/supabase/server";
import { obtenerPermisos } from "@/lib/permisos";
import { fmtNum } from "@/lib/formato";
import { Barras } from "@/components/Graficos";
import { Lineas } from "@/components/Lineas";
import { CargarUca } from "./Cargar";
import { Rack } from "./Rack";

export const dynamic = "force-dynamic";
type F = { k: string; a?: string; pos: number; oc: number; u?: number; pas?: number; p12?: number; o12?: number; p18?: number; o18?: number };
type D = { corte: string | null; posiciones: number; kpi: { pos: number; oc: number; u: number }; areas: F[] | null; pasillos: F[] | null; alturas: F[] | null; niveles: F[] | null; bahias: F[] | null;
  historial: { corte: string; pos: number; oc: number }[] | null; opciones: { areas: string[] | null; niveles: number[] | null; pasillos: string[] | null; bahias: number[] | null } };
const pct = (oc: number, pos: number) => (pos ? (oc / pos) * 100 : 0);
const color = (p: number) => (p >= 85 ? "bg-red-600" : p >= 70 ? "bg-amber-500" : "bg-green-600");
const txt = (p: number) => (p >= 85 ? "text-red-600" : p >= 70 ? "text-amber-600" : "text-green-700 dark:text-green-400");

export default async function Uca({ searchParams }: { searchParams: Promise<{ area?: string; altura?: string; nivel?: string; vacios?: string; pasillo?: string; bahia?: string }> }) {
  const sp = await searchParams;
  const s = await createClient();
  const { nivel } = await obtenerPermisos();
  const { data } = await s.rpc("uca_dash", { p_area: sp.area || null, p_altura: sp.altura || null, p_nivel: sp.nivel ? Number(sp.nivel) : null, p_pasillo: sp.pasillo || null, p_bahia: sp.bahia ? Number(sp.bahia) : null });
  const d = data as D | null;
  const puede = nivel("/inventario/uca") === "editar";
  const k = d?.kpi ?? { pos: 0, oc: 0, u: 0 };
  const sel = "h-9 rounded-lg border border-borde bg-tarjeta px-2 text-sm text-texto";
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
          <label className="flex flex-col gap-1 text-xs text-suave">Pasillo<select name="pasillo" defaultValue={sp.pasillo ?? ""} className={sel}><option value="">Todos</option>{(d.opciones.pasillos ?? []).filter(Boolean).sort().map((x) => <option key={x}>{x}</option>)}</select></label>
          <label className="flex flex-col gap-1 text-xs text-suave">Bahía<select name="bahia" defaultValue={sp.bahia ?? ""} className={sel}><option value="">Todas</option>{(d.opciones.bahias ?? []).filter((x) => x != null).sort((a, b) => a - b).map((x) => <option key={x}>{x}</option>)}</select></label>
          <button className="h-9 rounded-lg bg-marca px-4 text-sm font-semibold text-white">Ver</button>
        </form>
        <p className="-mt-3 text-xs text-suave">Elige un pasillo para ver la UCA por bahía; la lista de bahías se ajusta al área y pasillo después de tocar «Ver».</p>
        <section className="grid grid-cols-2 overflow-hidden rounded-xl bg-tarjeta sm:grid-cols-5">
          {[["Posiciones (paletas)", fmtNum(k.pos), ""], ["Ocupadas", fmtNum(k.oc), ""], ["Libres", fmtNum(k.pos - k.oc), "text-green-700"], ["UCA %", `${pct(k.oc, k.pos).toFixed(1)}%`, txt(pct(k.oc, k.pos))], ["Unidades en stock", fmtNum(Number(k.u)), ""]].map(([t, v, c]) => (
            <div key={t} className="text-center"><p className="bg-grafito py-1 text-xs font-semibold text-white">{t}</p><p className={`py-3 text-xl font-bold tabular-nums ${c}`}>{v}</p></div>))}
        </section>
        <div className="grid gap-4 lg:grid-cols-2">
          <Barras titulo="UCA por área (%)" max={100} color={color} fmt={(n) => `${n.toFixed(1)}%`} datos={(d.areas ?? []).map((x) => [x.k, pct(x.oc, x.pos)] as [string, number])}
            enlace={(a) => `?${new URLSearchParams({ ...(sp.altura ? { altura: sp.altura } : {}), area: a })}`} leyenda={<><span>Verde &lt; 70%</span><span>Ámbar 70–85%</span><span>Rojo ≥ 85% (casi lleno)</span></>} />
          {sp.pasillo && <Barras titulo={`UCA por bahía · ${sp.pasillo} (%)`} max={100} color={color} fmt={(n) => `${n.toFixed(1)}%`} datos={(d.bahias ?? []).map((x) => [`Bahía ${String(x.k).padStart(2, "0")}`, pct(x.oc, x.pos)] as [string, number])}
            enlace={(b) => `?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([kk, v]) => kk !== "bahia" && v) as [string, string][]), bahia: String(Number(b.replace("Bahía ", ""))) })}`} />}
          <Barras titulo="UCA por nivel (%)" max={100} color={color} fmt={(n) => `${n.toFixed(1)}%`} datos={(d.niveles ?? []).map((x) => [`Nivel ${x.k}`, pct(x.oc, x.pos)] as [string, number])} />
        </div>
        <Rack key={sp.pasillo ?? ""} inicial={sp.pasillo} pasillos={(d.pasillos ?? []).map((x) => ({ k: x.k, pos: x.pos, oc: x.oc }))} />
        {(d.historial?.length ?? 0) > 1 && <Lineas titulo="Evolución de la UCA (%) por corte" min={0} series={["UCA"]} datos={(d.historial ?? []).map((h) => ({ x: `${h.corte.slice(8)}/${h.corte.slice(5, 7)}`, UCA: Math.round(pct(h.oc, h.pos) * 10) / 10 }))} />}
        {(() => {
          const P = d.pasillos ?? [];
          const vacios = P.filter((x) => !x.oc).length;
          const ver = sp.vacios === "1" ? P : P.filter((x) => x.oc);
          const areas = [...new Set(P.map((x) => x.a ?? ""))].sort();
          const suma = (xs: F[], f: keyof F) => xs.reduce((t, x) => t + Number(x[f] ?? 0), 0);
          const qs = (v: boolean) => `?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([k2, v2]) => k2 !== "vacios" && v2) as [string, string][]), ...(v ? { vacios: "1" } : {}) })}`;
          const alt = (o: number, p: number) => !p ? <span className="text-suave">—</span> : (
            <span className="inline-flex flex-col items-end leading-tight"><span className="tabular-nums">{fmtNum(o)} <span className="text-suave">/ {fmtNum(p)}</span></span>{uca(o, p)}</span>);
          const barra = (o: number, p: number) => (
            <span className="flex items-center justify-end gap-2"><i className="block h-2.5 w-24 rounded bg-fondo"><i className={`block h-2.5 rounded ${color(pct(o, p))}`} style={{ width: `${Math.min(100, pct(o, p))}%` }} /></i><span className="w-14 text-right">{uca(o, p)}</span></span>);
          const fila = (x: F, tot = false) => (
            <tr key={(tot ? "T" : "") + x.k} className={`border-b border-borde text-right tabular-nums ${tot ? "bg-grafito/10 font-bold" : ""}`}>
              <td className={`px-2 py-1.5 text-left ${tot ? "" : "pl-6"}`}>{tot ? `${x.k} · ${x.pas} pasillos` : x.k}</td>
              <td className="px-2 py-1.5">{alt(x.o12 ?? 0, x.p12 ?? 0)}</td><td className="px-2 py-1.5">{alt(x.o18 ?? 0, x.p18 ?? 0)}</td>
              <td className="px-2 py-1.5">{fmtNum(x.oc)} <span className="text-suave">/ {fmtNum(x.pos)}</span></td><td className="px-2 py-1.5">{barra(x.oc, x.pos)}</td>
              <td className="px-2 py-1.5 text-green-700">{fmtNum(x.pos - x.oc)}</td><td className="px-2 py-1.5">{fmtNum(Number(x.u ?? 0))}</td></tr>);
          return (
            <section className="rounded-xl bg-tarjeta p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-marca">UCA por pasillo y altura <span className="text-xs font-normal text-suave">· ocupadas / posiciones</span></h2>
                <a href={qs(sp.vacios !== "1")} className="text-sm text-suave underline">{sp.vacios === "1" ? "Ocultar pasillos vacíos" : `Mostrar ${vacios} pasillos vacíos`}</a>
              </div>
              <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-sm">
                <thead className="bg-grafito text-white"><tr>{["Área / pasillo", "Altura 1.20", "Altura 1.80", "Total ocupadas", "UCA", "Libres", "Unidades"].map((h, i) => <th key={h} className={`px-2 py-2 font-semibold ${i ? "text-right" : "text-left"}`}>{h}</th>)}</tr></thead>
                <tbody>{areas.map((ar) => { const xs = P.filter((x) => x.a === ar), vs = ver.filter((x) => x.a === ar);
                  const t: F = { k: ar, pas: xs.length, pos: suma(xs, "pos"), oc: suma(xs, "oc"), u: suma(xs, "u"), p12: suma(xs, "p12"), o12: suma(xs, "o12"), p18: suma(xs, "p18"), o18: suma(xs, "o18") };
                  return [fila(t, true), ...vs.map((x) => fila(x))]; })}
                  {(() => { const t: F = { k: "TOTAL", pas: P.length, pos: suma(P, "pos"), oc: suma(P, "oc"), u: suma(P, "u"), p12: suma(P, "p12"), o12: suma(P, "o12"), p18: suma(P, "p18"), o18: suma(P, "o18") }; return fila(t, true); })()}
                </tbody></table></div>
              <p className="mt-2 text-xs text-suave">Cada área muestra su subtotal arriba. Los pasillos sin ninguna paleta se ocultan para leer mejor (siguen sumando en el total).</p>
            </section>);
        })()}
      </>)}
    </div>
  );
}
