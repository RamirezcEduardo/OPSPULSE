"use client";

import { useState, useTransition } from "react";
import { Link2, MapPin } from "lucide-react";
import { ACEPTA, leerArchivo } from "@/lib/parsers/archivo";
import { fechaFlexible } from "@/lib/parsers/csv";
import { cargarUbicacionesReportadas, vincularGrupos } from "./actions";

const pick = (r: Record<string, string>, ...ks: string[]) => { for (const k of ks) if (r[k]) return r[k].trim(); return ""; };

/** Dos cargas: (1) LPN ↔ Nro Grupo, (2) ubicaciones reportadas por Nro Grupo. Se filtra a lo que existe para enviar poco. */
export function CargasVinculo({ lpns, grupos }: { lpns: string[]; grupos: string[] }) {
  const L = new Set(lpns.map((x) => x.toUpperCase()));
  const G = new Set(grupos);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pend, start] = useTransition();

  async function grupo(f: File) {
    setMsg(null);
    const filas = (await leerArchivo(f)).map((r) => ({ nro_lpn: pick(r, "Nro LPN", "LPN", "lpn").toUpperCase(), nro_grupo: pick(r, "Nro Grupo", "Grupo", "NRO GRUPO") }))
      .filter((x) => x.nro_lpn && x.nro_grupo && L.has(x.nro_lpn));
    if (!filas.length) return setMsg({ ok: false, t: "Ningún LPN del archivo coincide con los bultos cargados (se necesitan columnas Nro LPN y Nro Grupo)." });
    start(async () => { const r = await vincularGrupos(filas); setMsg({ ok: r.ok, t: r.mensaje }); });
  }
  async function ubic(f: File) {
    setMsg(null);
    const todas = await leerArchivo(f);
    const filas = todas.map((r) => ({ nro_grupo: pick(r, "Nro Grupo", "Grupo", "NRO GRUPO"), ubicacion: pick(r, "Ubicacion", "Ubicación", "UBICACION"),
      fecha: fechaFlexible(pick(r, "Fe y Hr Crea", "Fe y Hr Modif", "Fecha")), usuario: pick(r, "Usuario creado", "Usuario Modificac", "Usuario") || null }))
      .filter((x) => x.nro_grupo && x.ubicacion && G.has(x.nro_grupo));
    if (!filas.length) return setMsg({ ok: false, t: grupos.length ? "Ningún Nro Grupo del archivo coincide con los bultos (se necesitan columnas Nro Grupo y Ubicacion)." : "Primero vincula los LPN con su Nro de grupo." });
    start(async () => { const r = await cargarUbicacionesReportadas(filas); setMsg({ ok: r.ok, t: r.mensaje }); });
  }
  const btn = "flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-marca px-4 text-sm font-semibold text-marca";
  return (
    <section className="rounded-xl bg-tarjeta p-5">
      <h2 className="font-semibold">Trazabilidad por Nro de grupo</h2>
      <p className="text-sm text-suave">1) Vincula cada LPN con su Nro de grupo · 2) Carga las ubicaciones reportadas de esos grupos para saber en qué zona se pierden.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className={btn}><Link2 size={16} /> {pend ? "Procesando…" : "Carga LPN ↔ Nro de grupo"}
          <input type="file" accept={ACEPTA} className="sr-only" onChange={(e) => { if (e.target.files?.[0]) grupo(e.target.files[0]); e.target.value = ""; }} /></label>
        <label className={btn}><MapPin size={16} /> {pend ? "Procesando…" : "Carga de ubicaciones reportadas"}
          <input type="file" accept={ACEPTA} className="sr-only" onChange={(e) => { if (e.target.files?.[0]) ubic(e.target.files[0]); e.target.value = ""; }} /></label>
      </div>
      <p className="mt-2 text-xs text-suave">{lpns.length} LPN cargados · {grupos.length} con Nro de grupo</p>
      {msg && <p role="status" className={`mt-2 text-sm ${msg.ok ? "text-green-700 dark:text-green-400" : "text-marca-oscuro"}`}>{msg.t}</p>}
    </section>
  );
}
