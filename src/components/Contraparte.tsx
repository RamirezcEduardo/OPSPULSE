"use client";

import { useEffect, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { consultarContraparte, type Mov } from "@/app/(app)/inventario/cruces/actions";
import { fmtFecha, fmtNum, fmtSoles } from "@/lib/formato";
import { cercania, parseUbicacion } from "@/lib/ubicacion";

/** Etiqueta de cercanía respecto a la ubicación de referencia del bulto. */
function Cerca({ de: r, u }: { de?: string | null; u: string | null }) {
  if (!r || !u) return null;
  const a = parseUbicacion(r), b = parseUbicacion(u);
  if (!a || !b || a.virtual || b.virtual) return null;
  const t = r.trim().toUpperCase() === u.trim().toUpperCase() ? "Misma ubicación" : ["", "Mismo pasillo", "Bahía vecina", "Misma bahía"][cercania(r, u)] || (a.area === b.area ? "Misma área" : "");
  if (!t) return null;
  const piso = a.piso != null && b.piso != null ? (a.piso === b.piso ? " · mismo piso" : ` · piso ${b.piso}`) : "";
  const fuerte = t !== "Misma área";
  return <span className={`ml-1 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-bold ${fuerte ? "bg-green-600 text-white" : "bg-fondo text-suave"}`}>{t}{piso}</span>;
}

/** Busca en la bolsa (conteo cíclico, ajustes LPN y shortpick) los movimientos del mismo SKU: la contraparte de un faltante o sobrante. */
export function Contraparte({ sku, pendientes, desde, auto = false, referencia }: { sku: string; pendientes?: number; desde?: string | null; auto?: boolean; referencia?: string | null }) {
  const [movs, setMovs] = useState<Mov[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [p, start] = useTransition();
  const [ini, setIni] = useState(desde ?? "");
  const consultar = () => start(async () => { const r = await consultarContraparte(sku, ini || null); setErr(r.ok ? null : r.mensaje); setMovs(r.movs); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (auto) consultar(); }, []);
  const cons = (movs ?? []).filter((m) => m.gestion === "CONSIDERAR");
  const neto = cons.reduce((a, m) => a + Number(m.un), 0);
  // Saldo por ubicación (o por grupo si no tiene ubicación): lo que queda en positivo después de netear es la posible contraparte
  const saldos = new Map<string, { k: string; un: number; fecha: string; grupo: string | null; area: string | null }>();
  for (const m of cons) {
    const k = m.ubicacion || `Grupo ${m.nro_grupo ?? "—"}`;
    const v = saldos.get(k) ?? { k, un: 0, fecha: m.fecha, grupo: m.nro_grupo, area: m.area };
    v.un += Number(m.un); if (m.fecha > v.fecha) { v.fecha = m.fecha; v.grupo = m.nro_grupo; }
    saldos.set(k, v);
  }
  const positivos = [...saldos.values()].filter((x) => x.un > 0).sort((a, b) => cercania(referencia, b.k) - cercania(referencia, a.k) || b.un - a.un);
  const veredicto = movs === null ? null : !cons.length ? ["Sin movimientos de este SKU en la bolsa en el periodo.", "bg-fondo text-suave"]
    : neto > 0 && pendientes && neto >= pendientes ? [`Posible cruce: el SKU tiene saldo POSITIVO de +${fmtNum(neto)} und en bolsa (neteado), cubre lo pendiente (${fmtNum(pendientes)} und).`, "bg-green-100 text-green-900"]
    : neto > 0 ? [`Saldo positivo de +${fmtNum(neto)} und en bolsa (neteado)${pendientes ? `; cubre parte de lo pendiente (${fmtNum(pendientes)} und)` : ""}.`, "bg-amber-100 text-amber-900"]
    : [`El SKU está neteado o en negativo (${fmtNum(neto)} und): no hay contraparte positiva en bolsa.`, "bg-red-100 text-red-900"];
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-borde p-3">
      <div className="flex flex-wrap items-end gap-2">
        <p className="mr-auto text-sm font-semibold">¿Su contraparte está en la bolsa?{referencia && <span className="block text-xs font-normal text-suave">Cercanía respecto a <b className="font-mono">{referencia}</b></span>}</p>
        <label className="flex flex-col gap-1 text-xs text-suave">Desde<input type="date" value={ini} onChange={(e) => setIni(e.target.value)} className="h-10 rounded-lg border border-borde bg-tarjeta px-2 text-sm text-texto" /></label>
        <button disabled={p} onClick={consultar} className="flex h-10 items-center gap-1.5 rounded-lg bg-grafito px-3 text-sm font-semibold text-white"><Search size={15} /> {p ? "Consultando…" : "Consultar"}</button>
      </div>
      {err && <p className="text-sm text-marca">{err}</p>}
      {veredicto && <p className={`rounded-lg p-2 text-sm font-semibold ${veredicto[1]}`}>{veredicto[0]}</p>}
      {neto > 0 && positivos.length > 0 && (
        <div className="rounded-lg border border-green-300 p-2 text-sm">
          <p className="mb-1 font-semibold text-green-800">Dónde está el positivo (saldo después de netear):</p>
          <ul className="flex flex-col gap-1">{positivos.slice(0, 8).map((x) => (
            <li key={x.k} className="flex flex-wrap justify-between gap-2"><span><b className="font-mono">{x.k}</b><Cerca de={referencia} u={x.k} /> · {x.area ?? ""}{x.grupo && !x.k.startsWith("Grupo") ? ` · grupo ${x.grupo}` : ""} · último {fmtFecha(x.fecha)}</span><b className="text-green-700">+{fmtNum(x.un)} und</b></li>))}</ul>
        </div>)}
      {movs && movs.length > 0 && (
        <div className="max-h-80 overflow-auto"><table className="w-full min-w-[640px] text-xs">
          <thead className="sticky top-0 bg-grafito text-left text-white"><tr>{["Fecha", "Grupo", "Ubicación", "Área", "Und", "S/", "Motivo", "Gestión"].map((h) => <th key={h} className="px-2 py-1.5 font-semibold">{h}</th>)}</tr></thead>
          <tbody>{movs.map((m, i) => (
            <tr key={i} className={`border-b border-borde ${m.gestion !== "CONSIDERAR" ? "opacity-50" : ""}`}>
              <td className="whitespace-nowrap px-2 py-1">{fmtFecha(m.fecha)}</td><td className="px-2 py-1">{m.nro_grupo ?? "—"}</td><td className="px-2 py-1 font-mono">{m.ubicacion ?? "—"}<Cerca de={referencia} u={m.ubicacion} /></td><td className="px-2 py-1">{m.area}</td>
              <td className={`px-2 py-1 text-right font-bold ${Number(m.un) < 0 ? "text-marca" : "text-green-700"}`}>{Number(m.un) > 0 ? "+" : ""}{fmtNum(Number(m.un))}</td>
              <td className="px-2 py-1 text-right">{fmtSoles(Number(m.valor))}</td><td className="px-2 py-1">{m.motivo}</td><td className="px-2 py-1">{m.gestion}</td></tr>))}</tbody></table></div>)}
    </section>
  );
}
