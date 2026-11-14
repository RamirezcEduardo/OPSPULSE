"use client";

import { useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { parseCSV } from "@/lib/parsers/csv";
import { faltanColumnasReabasto, mapearReabasto, type FilaReabasto } from "@/lib/parsers/reabasto";
import { cargarReabasto } from "./actions";

export function CargarReabasto() {
  const [prev, setPrev] = useState<{ archivo: string; filas: FilaReabasto[] } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pend, start] = useTransition();
  async function leer(f: File) {
    setMsg(null);
    const filas = parseCSV(await f.text());
    if (!filas.length) return setMsg({ ok: false, t: "El archivo está vacío." });
    const falta = faltanColumnasReabasto(Object.keys(filas[0]));
    if (falta.length) return setMsg({ ok: false, t: `No es el export de Asignación. Faltan: ${falta.join(", ")}` });
    setPrev({ archivo: f.name, filas: filas.map(mapearReabasto) });
  }
  const estados = prev ? Object.entries(prev.filas.reduce<Record<string, number>>((a, f) => ((a[f.estado ?? "?"] = (a[f.estado ?? "?"] ?? 0) + 1), a), {})) : [];
  return (
    <section className="rounded-xl bg-tarjeta p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Cargar programación de reabasto</h2>
          <p className="text-sm text-suave">WMS › Asignación › bandera = No (CSV)</p>
        </div>
        <label className="flex h-11 cursor-pointer items-center gap-2 rounded-lg bg-marca px-4 text-sm font-semibold text-white hover:bg-marca-oscuro">
          <Upload size={16} /> Elegir archivo
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => e.target.files?.[0] && leer(e.target.files[0])} />
        </label>
      </div>
      {prev && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-borde p-3 text-sm">
          <span className="font-medium">{prev.archivo}</span><span>{prev.filas.length} tareas</span>
          {estados.map(([e, n]) => <span key={e} className="rounded-full bg-fondo px-2 py-0.5">{e}: {n}</span>)}
          <div className="ml-auto flex gap-2">
            <button onClick={() => setPrev(null)} className="h-10 rounded-lg border border-borde px-3">Cancelar</button>
            <button disabled={pend} onClick={() => start(async () => { const r = await cargarReabasto(prev.archivo, prev.filas); setMsg({ ok: r.ok, t: r.mensaje }); if (r.ok) setPrev(null); })}
              className="h-10 rounded-lg bg-marca px-4 font-semibold text-white disabled:opacity-60">{pend ? "Cargando…" : "Confirmar carga"}</button>
          </div>
        </div>
      )}
      {msg && <p role="status" className={`mt-3 text-sm ${msg.ok ? "text-green-700 dark:text-green-400" : "text-marca-oscuro"}`}>{msg.t}</p>}
    </section>
  );
}
