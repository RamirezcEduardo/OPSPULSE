"use client";

import { useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { ACEPTA, leerArchivo } from "@/lib/parsers/archivo";
import { mapearBulto, type FilaBulto } from "@/lib/parsers/busqueda";
import { cargarBultos } from "./actions";

export function CargarBultos({ clas }: { clas: "perdidos" | "sin_ubicacion" }) {
  const [prev, setPrev] = useState<{ archivo: string; filas: FilaBulto[] } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pend, start] = useTransition();
  async function leer(f: File) {
    setMsg(null);
    const filas = await leerArchivo(f);
    if (!filas.length || !("Nro LPN" in filas[0] || "lpn" in filas[0])) return setMsg({ ok: false, t: "Falta la columna Nro LPN." });
    setPrev({ archivo: f.name, filas: filas.map((r) => mapearBulto(r, clas)) });
  }
  return (
    <section className="rounded-xl bg-tarjeta p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-semibold">Cargar DATA (perdidos y sin ubicación)</h2><p className="text-sm text-suave">Un solo archivo: «Sin Ubicación» va a Sin ubicación y los demás procesos a Perdidos</p></div>
        <label className="flex h-11 cursor-pointer items-center gap-2 rounded-lg bg-marca px-4 text-sm font-semibold text-white"><Upload size={16} /> Elegir archivo
          <input type="file" accept={ACEPTA} className="sr-only" onChange={(e) => e.target.files?.[0] && leer(e.target.files[0])} /></label>
      </div>
      {prev && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-borde p-3 text-sm">
          <span className="font-medium">{prev.archivo}</span><span>{prev.filas.length} bultos</span><span className="rounded-full bg-fondo px-2 py-0.5">Perdidos: {prev.filas.filter((f) => f.clasificacion === "perdidos").length}</span><span className="rounded-full bg-fondo px-2 py-0.5">Sin ubicación: {prev.filas.filter((f) => f.clasificacion === "sin_ubicacion").length}</span>
          <div className="ml-auto flex gap-2">
            <button onClick={() => setPrev(null)} className="h-10 rounded-lg border border-borde px-3">Cancelar</button>
            <button disabled={pend || !prev.filas.length} onClick={() => start(async () => { const r = await cargarBultos(clas, prev.archivo, prev.filas); setMsg({ ok: r.ok, t: r.mensaje }); if (r.ok) setPrev(null); })}
              className="h-10 rounded-lg bg-marca px-4 font-semibold text-white disabled:opacity-60">{pend ? "Cargando…" : "Confirmar carga"}</button>
          </div>
        </div>)}
      {msg && <p role="status" className={`mt-3 text-sm ${msg.ok ? "text-green-700 dark:text-green-400" : "text-marca-oscuro"}`}>{msg.t}</p>}
    </section>
  );
}
