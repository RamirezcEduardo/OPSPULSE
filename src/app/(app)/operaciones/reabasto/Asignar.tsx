"use client";

import { useMemo, useState, useTransition } from "react";
import { asignarAuditor } from "./actions";

type F = { id: number; fecha: string; ubicacion: string; cod_alternat: string; descripcion: string | null; area: string | null; usuario_reabasto: string | null; auditor_id: string | null; auditor_asignado: string | null; validado_en: string | null };
type Aud = { id: string; nombre: string; usuario: string; rol: string };

export function Asignar({ filas, auditores }: { filas: F[]; auditores: Aud[] }) {
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [aud, setAud] = useState("");
  const [soloSin, setSoloSin] = useState(true);
  const [area, setArea] = useState("Todas");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pend, start] = useTransition();
  const areas = ["Todas", ...new Set(filas.map((f) => f.area).filter(Boolean) as string[])];
  const vis = useMemo(() => filas.filter((f) => (!soloSin || !f.auditor_id) && (area === "Todas" || f.area === area) && !f.validado_en), [filas, soloSin, area]);
  const sinAsignar = filas.filter((f) => !f.auditor_id && !f.validado_en).length;
  const toggle = (id: number) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const todos = vis.length > 0 && vis.every((f) => sel.has(f.id));

  return (
    <section className="rounded-xl bg-tarjeta p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-semibold">Asignar auditores</h2><p className="text-sm text-suave">{sinAsignar} activos sin auditor · marca los activos y elige quién los audita</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Auditor" value={aud} onChange={(e) => setAud(e.target.value)} className="h-10 rounded-lg border border-borde bg-tarjeta px-2 text-sm">
            <option value="">— Elegir auditor —</option>
            {auditores.map((a) => <option key={a.id} value={a.id}>{a.nombre} ({a.rol})</option>)}
          </select>
          <button disabled={!aud || !sel.size || pend} onClick={() => start(async () => {
            const r = await asignarAuditor([...sel], aud); setMsg({ ok: r.ok, t: r.mensaje }); if (r.ok) setSel(new Set());
          })} className="h-10 rounded-lg bg-marca px-4 text-sm font-semibold text-white disabled:opacity-40">{pend ? "Asignando…" : `Asignar ${sel.size || ""}`}</button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={soloSin} onChange={(e) => setSoloSin(e.target.checked)} /> Solo sin asignar</label>
        {areas.map((a) => <button key={a} onClick={() => setArea(a)} aria-pressed={area === a} className={`h-8 rounded-full border px-3 ${area === a ? "border-marca bg-marca text-white" : "border-borde"}`}>{a}</button>)}
      </div>
      {msg && <p role="status" className={`mt-2 text-sm ${msg.ok ? "text-green-700 dark:text-green-400" : "text-marca-oscuro"}`}>{msg.t}</p>}
      <div className="mt-3 max-h-96 overflow-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="sticky top-0 bg-tarjeta text-left text-suave"><tr>
            <th className="border-b border-borde px-2 py-2"><input type="checkbox" aria-label="Seleccionar todos" checked={todos} onChange={() => setSel(todos ? new Set() : new Set(vis.map((f) => f.id)))} /></th>
            {["Activo", "SKU", "Descripción", "Área", "Reabasteció", "Auditor"].map((h) => <th key={h} className="border-b border-borde px-2 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>{vis.map((f) => (
            <tr key={f.id} className="border-b border-borde" onClick={() => toggle(f.id)}>
              <td className="px-2 py-1.5"><input type="checkbox" aria-label={`Seleccionar ${f.ubicacion}`} checked={sel.has(f.id)} onChange={() => toggle(f.id)} onClick={(e) => e.stopPropagation()} /></td>
              <td className="px-2 py-1.5 font-mono text-xs">{f.ubicacion}</td><td className="px-2 py-1.5">{f.cod_alternat}</td>
              <td className="max-w-56 truncate px-2 py-1.5">{f.descripcion}</td><td className="px-2 py-1.5">{f.area}</td><td className="px-2 py-1.5">{f.usuario_reabasto}</td>
              <td className="px-2 py-1.5">{f.auditor_id ? f.auditor_asignado : <span className="text-marca">Sin asignar</span>}</td>
            </tr>))}</tbody>
        </table>
        {!vis.length && <p className="py-3 text-sm text-suave">✓ No hay activos pendientes de asignar.</p>}
      </div>
    </section>
  );
}
