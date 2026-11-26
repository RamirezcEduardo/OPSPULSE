"use client";

import { useEffect, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { consultarContraparte, type Mov } from "@/app/(app)/inventario/cruces/actions";
import { fmtFecha, fmtNum, fmtSoles } from "@/lib/formato";

/** Busca en la bolsa (conteo cíclico, ajustes LPN y shortpick) los movimientos del mismo SKU: la contraparte de un faltante o sobrante. */
export function Contraparte({ sku, pendientes, desde, auto = false }: { sku: string; pendientes?: number; desde?: string | null; auto?: boolean }) {
  const [movs, setMovs] = useState<Mov[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [p, start] = useTransition();
  const [ini, setIni] = useState(desde ?? "");
  const consultar = () => start(async () => { const r = await consultarContraparte(sku, ini || null); setErr(r.ok ? null : r.mensaje); setMovs(r.movs); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (auto) consultar(); }, []);
  const cons = (movs ?? []).filter((m) => m.gestion === "CONSIDERAR");
  const sob = cons.filter((m) => Number(m.un) > 0), fal = cons.filter((m) => Number(m.un) < 0);
  const uS = sob.reduce((a, m) => a + Number(m.un), 0), uF = fal.reduce((a, m) => a + Number(m.un), 0);
  const neto = uS + uF;
  const veredicto = movs === null ? null : !cons.length ? ["Sin movimientos de este SKU en la bolsa en el periodo.", "bg-fondo text-suave"]
    : pendientes && uS >= pendientes ? [`Posible cruce: hay sobrantes por ${fmtNum(uS)} und del mismo SKU (pendiente ${fmtNum(pendientes)} und). Revisa si ya fue ajustado en bolsa.`, "bg-green-100 text-green-900"]
    : uS > 0 ? [`Sobrantes parciales: ${fmtNum(uS)} und del mismo SKU. Neto del SKU en bolsa: ${fmtNum(neto)} und.`, "bg-amber-100 text-amber-900"]
    : [`Solo faltantes (${fmtNum(uF)} und): no hay contraparte en bolsa.`, "bg-red-100 text-red-900"];
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-borde p-3">
      <div className="flex flex-wrap items-end gap-2">
        <p className="mr-auto text-sm font-semibold">¿Su contraparte está en la bolsa?</p>
        <label className="flex flex-col gap-1 text-xs text-suave">Desde<input type="date" value={ini} onChange={(e) => setIni(e.target.value)} className="h-10 rounded-lg border border-borde bg-tarjeta px-2 text-sm text-texto" /></label>
        <button disabled={p} onClick={consultar} className="flex h-10 items-center gap-1.5 rounded-lg bg-grafito px-3 text-sm font-semibold text-white"><Search size={15} /> {p ? "Consultando…" : "Consultar"}</button>
      </div>
      {err && <p className="text-sm text-marca">{err}</p>}
      {veredicto && <p className={`rounded-lg p-2 text-sm font-semibold ${veredicto[1]}`}>{veredicto[0]}</p>}
      {movs && movs.length > 0 && (
        <div className="max-h-80 overflow-auto"><table className="w-full min-w-[640px] text-xs">
          <thead className="sticky top-0 bg-grafito text-left text-white"><tr>{["Fecha", "Grupo", "Ubicación", "Área", "Und", "S/", "Motivo", "Gestión"].map((h) => <th key={h} className="px-2 py-1.5 font-semibold">{h}</th>)}</tr></thead>
          <tbody>{movs.map((m, i) => (
            <tr key={i} className={`border-b border-borde ${m.gestion !== "CONSIDERAR" ? "opacity-50" : ""}`}>
              <td className="whitespace-nowrap px-2 py-1">{fmtFecha(m.fecha)}</td><td className="px-2 py-1">{m.nro_grupo ?? "—"}</td><td className="px-2 py-1 font-mono">{m.ubicacion ?? "—"}</td><td className="px-2 py-1">{m.area}</td>
              <td className={`px-2 py-1 text-right font-bold ${Number(m.un) < 0 ? "text-marca" : "text-green-700"}`}>{Number(m.un) > 0 ? "+" : ""}{fmtNum(Number(m.un))}</td>
              <td className="px-2 py-1 text-right">{fmtSoles(Number(m.valor))}</td><td className="px-2 py-1">{m.motivo}</td><td className="px-2 py-1">{m.gestion}</td></tr>))}</tbody></table></div>)}
    </section>
  );
}
