"use client";

import { useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { ACEPTA, leerArchivo } from "@/lib/parsers/archivo";
import { COLS_ACTIVO, mapearActivo, type FilaActivo } from "@/lib/parsers/reabasto";
import { cargarActivos } from "./actions";

export function CargarActivos() {
  const [prev, setPrev] = useState<{ archivo: string; filas: FilaActivo[] } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pend, start] = useTransition();
  async function leer(f: File) {
    setMsg(null);
    const filas = await leerArchivo(f);
    const falta = filas.length ? COLS_ACTIVO.filter((c) => !(c in filas[0])) : COLS_ACTIVO;
    if (falta.length) return setMsg({ ok: false, t: `No es el formato de auditoría. Faltan: ${falta.join(", ")}` });
    setPrev({ archivo: f.name, filas: filas.map(mapearActivo) });
  }
  return (
    <section className="rounded-xl bg-tarjeta p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-semibold">Cargar auditoría de activos</h2><p className="text-sm text-suave">Formato «INVENTARIO EN ACTIVOS» (Excel o CSV)</p></div>
        <label className="flex h-11 cursor-pointer items-center gap-2 rounded-lg bg-marca px-4 text-sm font-semibold text-white"><Upload size={16} /> Elegir archivo
          <input type="file" accept={ACEPTA} className="sr-only" onChange={(e) => e.target.files?.[0] && leer(e.target.files[0])} /></label>
      </div>
      {prev && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-borde p-3 text-sm">
          <span className="font-medium">{prev.archivo}</span><span>{prev.filas.length} activos</span>
          
          <div className="ml-auto flex gap-2">
            <button onClick={() => setPrev(null)} className="h-10 rounded-lg border border-borde px-3">Cancelar</button>
            <button disabled={pend} onClick={() => start(async () => { const r = await cargarActivos(prev.archivo, prev.filas); setMsg({ ok: r.ok, t: r.mensaje }); if (r.ok) setPrev(null); })}
              className="h-10 rounded-lg bg-marca px-4 font-semibold text-white disabled:opacity-60">{pend ? "Cargando…" : "Confirmar carga"}</button>
          </div>
        </div>)}
      {msg && <p role="status" className={`mt-3 text-sm ${msg.ok ? "text-green-700 dark:text-green-400" : "text-marca-oscuro"}`}>{msg.t}</p>}
    </section>
  );
}
