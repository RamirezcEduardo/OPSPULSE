"use client";
import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { guardarTolerancia } from "./actions";

export function EditarTolerancia({ obj }: { obj: Record<string, number> }) {
  const [abierto, setAbierto] = useState(false);
  const [v, setV] = useState(obj);
  const [msg, setMsg] = useState<string | null>(null);
  const [p, start] = useTransition();
  if (!abierto) return <button onClick={() => setAbierto(true)} className="flex items-center gap-1 rounded-lg border border-borde px-3 py-1.5 text-xs font-semibold"><Pencil size={13} /> Editar tolerancias</button>;
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-borde p-3">
      {["Q1", "Q2", "Q3", "Q4"].map((q) => (
        <label key={q} className="flex flex-col gap-1 text-xs text-suave">{q} · Obj MD S/
          <input type="number" inputMode="decimal" value={v[q] ?? 0} onChange={(e) => setV({ ...v, [q]: Number(e.target.value) })} className="h-10 w-32 rounded-lg border border-borde bg-tarjeta px-2 text-sm text-texto" /></label>))}
      <button disabled={p} onClick={() => start(async () => { const r = await guardarTolerancia(v); setMsg(r.mensaje); if (r.ok) setAbierto(false); })} className="h-10 rounded-lg bg-marca px-4 text-sm font-semibold text-white">{p ? "…" : "Guardar"}</button>
      <button onClick={() => setAbierto(false)} className="h-10 rounded-lg border border-borde px-3 text-sm">Cancelar</button>
      {msg && <p className="w-full text-xs">{msg}</p>}
    </div>
  );
}
