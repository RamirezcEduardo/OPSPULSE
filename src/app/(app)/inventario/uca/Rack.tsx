"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { fmtNum } from "@/lib/formato";
import { ucaRack, type Celda } from "./actions";

/** Vista 2D del frente del rack: columnas = bahías, filas = niveles (arriba el más alto); cada cuadro = una posición (paleta). */
export function Rack({ pasillos, inicial }: { pasillos: { k: string; a: string; pos: number; oc: number }[]; inicial?: string }) {
  const areas = useMemo(() => [...new Set(pasillos.map((x) => x.a))].sort(), [pasillos]);
  const [area, setArea] = useState(pasillos.find((x) => x.k === inicial)?.a ?? areas[0] ?? "");
  const lista = useMemo(() => pasillos.filter((x) => x.a === area).sort((x, y) => x.k.localeCompare(y.k, "es", { numeric: true })), [pasillos, area]);
  const [pas, setPas] = useState(inicial && pasillos.some((x) => x.k === inicial) ? inicial : lista[0]?.k ?? "");
  const cambiarArea = (a: string) => { setArea(a); setPas(pasillos.filter((x) => x.a === a).sort((x, y) => x.k.localeCompare(y.k, "es", { numeric: true }))[0]?.k ?? ""); };
  const [celdas, setCeldas] = useState<Celda[]>([]);
  const [sel, setSel] = useState<Celda | null>(null);
  const [p, start] = useTransition();
  useEffect(() => { if (pas) start(async () => { setSel(null); setCeldas(await ucaRack(pas)); }); }, [pas]);
  const bahias = useMemo(() => [...new Set(celdas.map((c) => c.bahia))].sort((a, b) => a - b), [celdas]);
  const niveles = useMemo(() => [...new Set(celdas.map((c) => c.nivel))].sort((a, b) => b - a), [celdas]);
  const oc = celdas.filter((c) => c.unidades > 0).length;
  const max = Math.max(1, ...celdas.map((c) => Number(c.unidades)));
  const tono = (c: Celda) => (c.unidades > 0 ? `rgba(234,108,0,${0.45 + (0.55 * Number(c.unidades)) / max})` : undefined);
  return (
    <section className="rounded-xl bg-tarjeta p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="font-semibold text-marca">Vista del rack · frente del pasillo</h2>
          <p className="text-xs text-suave">Cada cuadro es una posición (paleta). Naranja = ocupada (más intenso = más unidades) · blanco = libre. Toca una posición para ver su detalle. Esta vista tiene su propio filtro de área; no la afectan los filtros de arriba.</p></div>
        <label className="flex items-center gap-2 text-sm">Área
          <select value={area} onChange={(e) => cambiarArea(e.target.value)} className="h-9 rounded-lg border border-borde bg-tarjeta px-2">
            {areas.map((a) => <option key={a} value={a}>{a || "Sin área"}</option>)}</select></label>
      </div>
      {/* Selector rápido de pasillos como mapa */}
      <div className="mb-4 flex flex-wrap gap-1.5">{lista.map((x) => { const u = x.pos ? x.oc / x.pos : 0; return (
        <button key={x.k} onClick={() => setPas(x.k)} title={`${x.k}: ${x.oc}/${x.pos}`}
          className={`rounded-md border px-2 py-1 text-xs font-semibold ${pas === x.k ? "border-marca ring-2 ring-marca" : "border-borde"}`}
          style={{ background: `rgba(234,108,0,${0.08 + u * 0.8})`, color: u > 0.55 ? "white" : undefined }}>{x.k.split("-")[1] ?? x.k}</button>); })}</div>
      {p ? <p className="text-sm text-suave">Cargando rack…</p> : !celdas.length ? <p className="text-sm text-suave">Sin posiciones para este pasillo.</p> : (<>
        <p className="mb-2 text-sm"><b>{pas}</b> · {fmtNum(oc)} de {fmtNum(celdas.length)} posiciones ocupadas · <b className="text-marca">{((oc / celdas.length) * 100).toFixed(1)}%</b></p>
        <div className="overflow-x-auto pb-2">
          <table className="border-separate" style={{ borderSpacing: 2 }}>
            <tbody>
              {niveles.map((n) => (
                <tr key={n}>
                  <td className="sticky left-0 bg-tarjeta pr-2 text-right text-[10px] text-suave">Nv {n}</td>
                  {bahias.map((b) => { const cs = celdas.filter((c) => c.bahia === b && c.nivel === n); return (
                    <td key={b} className="p-0 align-middle">
                      <div className="flex gap-[2px]">{cs.length ? cs.map((c) => (
                        <button key={c.ubicacion} onClick={() => setSel(c)} title={`${c.ubicacion} · ${c.unidades > 0 ? `${fmtNum(Number(c.unidades))} und` : "libre"}`}
                          className={`h-5 w-4 rounded-[3px] border ${sel?.ubicacion === c.ubicacion ? "border-grafito ring-2 ring-grafito" : c.unidades > 0 ? "border-orange-700/40" : "border-borde bg-white dark:bg-neutral-800"}`}
                          style={{ background: tono(c) }} />)) : <span className="block h-5 w-4" />}</div>
                    </td>); })}
                </tr>))}
              <tr><td />{bahias.map((b) => <td key={b} className="text-center text-[10px] text-suave">{String(b).padStart(2, "0")}</td>)}</tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-suave">Abajo: número de bahía · Izquierda: nivel</p>
        {sel && (
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg border border-borde p-3 text-sm">
            <b className="font-mono">{sel.ubicacion}</b><span>Bahía {sel.bahia} · Nivel {sel.nivel} · Altura {sel.altura ?? "—"}</span>
            {sel.unidades > 0 ? <span className="font-semibold text-marca">{fmtNum(Number(sel.unidades))} und · {sel.lpns} LPN · {sel.skus} SKU{sel.skus > 1 ? "s" : ""}</span> : <span className="font-semibold text-green-700">Libre</span>}
          </div>)}
      </>)}
    </section>
  );
}
