"use client";

import { useState, useTransition } from "react";
import { Fotos } from "@/components/Fotos";
import { PROCESOS, TIPOS, TURNOS, UNIDADES } from "../opciones";
import { buscarProducto, registrarIncidencia } from "../actions";

const campo = "h-12 w-full rounded-xl border border-borde bg-tarjeta px-3 text-base";
function Chips({ ops, v, set, fijo }: { ops: string[]; v: string; set: (x: string) => void; fijo?: boolean }) {
  return <div className="flex flex-wrap gap-2">{ops.map((o) => (
    <button key={o} type="button" onClick={() => set(v === o && !fijo ? "" : o)} aria-pressed={v === o}
      className={`min-h-10 rounded-full border px-3 py-1.5 text-sm ${v === o ? "border-marca bg-marca text-white" : "border-borde"}`}>{o}</button>))}</div>;
}
function SiNo({ v, set }: { v: boolean | null; set: (x: boolean) => void }) {
  return <div className="grid grid-cols-2 gap-2">{[true, false].map((b) => (
    <button key={String(b)} type="button" onClick={() => set(b)} aria-pressed={v === b}
      className={`h-12 rounded-xl border-2 font-bold ${v === b ? (b ? "border-green-600 bg-green-600 text-white" : "border-marca bg-marca text-white") : "border-borde"}`}>{b ? "Sí" : "No"}</button>))}</div>;
}

export function FormIncidencia({ hoy }: { hoy: string }) {
  const vacio = { fecha: hoy, turno: "", tipo: "", proceso: "", cod: "", desc: "", ubic: "", unidad: "", cant: "", lpn: "", ubicado: null as boolean | null, encontrada: "", devuelto: null as boolean | null, coment: "" };
  const [f, setF] = useState(vacio);
  const [fotos, setFotos] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pend, start] = useTransition();
  const [falta, setFalta] = useState(false);
  const set = (k: keyof typeof vacio) => (v: unknown) => setF((x) => ({ ...x, [k]: v }));

  async function autocompletar() {
    if (!f.cod.trim() || f.desc) return;
    const d = await buscarProducto(f.cod); if (d) setF((x) => ({ ...x, desc: d }));
  }
  function enviar() {
    start(async () => {
      const r = await registrarIncidencia({
        fecha: f.fecha, turno: f.turno || null, tipo: f.tipo, proceso: f.proceso, cod_alternat: f.cod.trim() || null, descripcion: f.desc.trim() || null,
        ubic_asignada: f.ubic.trim().toUpperCase() || null, unidad: f.unidad || null, cantidad: f.cant === "" ? null : Number(f.cant), lpn: f.lpn.trim().toUpperCase() || null,
        ubicado: f.ubicado, ubic_encontrada: f.ubicado ? f.encontrada.trim().toUpperCase() || null : null, devuelto: f.ubicado ? f.devuelto : null, comentarios: f.coment.trim() || null, fotos,
      });
      setMsg({ ok: r.ok, t: r.mensaje });
      if (r.ok) { setF({ ...vacio, fecha: f.fecha, turno: f.turno }); setFotos([]); window.scrollTo({ top: 0, behavior: "smooth" }); }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {msg && <p role="status" className={`rounded-xl p-3 text-sm font-semibold ${msg.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{msg.t}</p>}
      <section className="flex flex-col gap-3 rounded-xl bg-tarjeta p-5">
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-sm">Fecha<input type="date" value={f.fecha} onChange={(e) => set("fecha")(e.target.value)} className={campo} /></label>
          <div className="flex flex-col gap-1 text-sm">Turno<Chips ops={TURNOS} v={f.turno} set={set("turno")} /></div>
        </div>
        <div id="campo-tipo" className={`flex flex-col gap-1.5 rounded-lg text-sm font-semibold ${falta && !f.tipo ? "p-2 ring-2 ring-red-500" : ""}`}>Tipo de incidencia *<Chips fijo ops={TIPOS} v={f.tipo} set={set("tipo")} /></div>
        <div id="campo-proceso" className={`flex flex-col gap-1.5 rounded-lg text-sm font-semibold ${falta && !f.proceso ? "p-2 ring-2 ring-red-500" : ""}`}>Proceso donde se originó *<Chips fijo ops={PROCESOS} v={f.proceso} set={set("proceso")} /></div>
      </section>
      <section className="flex flex-col gap-3 rounded-xl bg-tarjeta p-5">
        <label className="flex flex-col gap-1 text-sm">Código del producto (Cod Alternat)
          <input inputMode="numeric" value={f.cod} onChange={(e) => set("cod")(e.target.value)} onBlur={autocompletar} className={campo} /></label>
        <label className="flex flex-col gap-1 text-sm">Descripción<input value={f.desc} onChange={(e) => set("desc")(e.target.value)} className={campo} placeholder="Se completa sola con el código" /></label>
        <label className="flex flex-col gap-1 text-sm">Ubicación asignada (donde debería estar)<input value={f.ubic} onChange={(e) => set("ubic")(e.target.value)} className={`${campo} font-mono`} /></label>
        <div className="flex flex-col gap-1.5 text-sm">Unidad de manejo<Chips ops={UNIDADES} v={f.unidad} set={set("unidad")} /></div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-sm">Cantidad<input type="number" inputMode="numeric" value={f.cant} onChange={(e) => set("cant")(e.target.value)} className={campo} /></label>
          <label className="flex flex-col gap-1 text-sm">LPN / CJ<input value={f.lpn} onChange={(e) => set("lpn")(e.target.value)} className={`${campo} font-mono`} /></label>
        </div>
      </section>
      <section className="flex flex-col gap-3 rounded-xl bg-tarjeta p-5">
        <div className="flex flex-col gap-1.5 text-sm font-semibold">¿Ubicaste el producto?<SiNo v={f.ubicado} set={set("ubicado")} /></div>
        {f.ubicado && (<>
          <label className="flex flex-col gap-1 text-sm">Ubicación donde lo encontraste<input value={f.encontrada} onChange={(e) => set("encontrada")(e.target.value)} className={`${campo} font-mono`} /></label>
          <div className="flex flex-col gap-1.5 text-sm font-semibold">¿Lo devolviste a su ubicación?<SiNo v={f.devuelto} set={set("devuelto")} /></div>
        </>)}
        <Fotos carpeta="incidencias" fotos={fotos} setFotos={setFotos} />
        <textarea rows={3} placeholder="Comentarios" value={f.coment} onChange={(e) => set("coment")(e.target.value)} className="rounded-xl border border-borde bg-tarjeta p-3 text-sm" />
      </section>
      <button disabled={pend} onClick={() => { if (!f.tipo || !f.proceso) { setFalta(true); document.getElementById(!f.tipo ? "campo-tipo" : "campo-proceso")?.scrollIntoView({ behavior: "smooth", block: "center" }); return; } setFalta(false); enviar(); }} className="h-14 rounded-xl bg-marca text-lg font-bold text-white disabled:opacity-40">
        {pend ? "Guardando…" : !f.tipo || !f.proceso ? `Falta elegir ${!f.tipo ? "el tipo" : "el proceso"} ↑` : "Registrar incidencia"}</button>
    </div>
  );
}
