"use client";

import { useMemo, useState, useTransition } from "react";
import { Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BLOQUES_5S, calcular5S, type Respuesta5S } from "@/lib/reglas/cincoS";
import { guardar5S } from "../actions";

const OPCIONES: { v: Respuesta5S; c: string }[] = [
  { v: "Cumple", c: "border-green-600 bg-green-600 text-white" },
  { v: "Parcial", c: "border-amber-500 bg-amber-500 text-white" },
  { v: "No cumple", c: "border-marca bg-marca text-white" },
  { v: "N.A.", c: "border-neutral-500 bg-neutral-500 text-white" },
];
const campo = "h-12 rounded-xl border border-borde bg-tarjeta px-3 text-base";
const colorNivel = (n: string | null) =>
  n === "EXCELENTE" ? "text-green-600" : n === "BUENO" ? "text-blue-600" : n === "REGULAR" ? "text-amber-600" : n ? "text-marca" : "text-suave";

export function Formulario5S({ hoy, areas, supervisores }: { hoy: string; areas: string[]; supervisores: string[] }) {
  const [fecha, setFecha] = useState(hoy);
  const [area, setArea] = useState("");
  const [ubic, setUbic] = useState("");
  const [turno, setTurno] = useState("");
  const [sup, setSup] = useState("");
  const [resp, setResp] = useState<Record<string, Respuesta5S>>({});
  const [hall, setHall] = useState("");
  const [accion, setAccion] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pend, start] = useTransition();

  const total = BLOQUES_5S.reduce((s, b) => s + b.items.length, 0);
  const respondidas = Object.keys(resp).length;
  const calc = useMemo(() => calcular5S(resp), [resp]);

  async function subirFoto(f: File) {
    setSubiendo(true);
    const ruta = `5s/${fecha}/${(area || "area").replace(/[^\w-]/g, "_")}-${Date.now()}.${f.name.split(".").pop() || "jpg"}`;
    const { error } = await createClient().storage.from("fotos").upload(ruta, f, { contentType: f.type });
    setSubiendo(false);
    if (error) return setMsg({ ok: false, t: `No se pudo subir la foto: ${error.message}` });
    setFotos((p) => [...p, ruta]);
  }

  function todoCumple(s: number) {
    const b = BLOQUES_5S.find((x) => x.s === s)!;
    setResp((r) => ({ ...r, ...Object.fromEntries(b.items.map(([id]) => [id, "Cumple" as Respuesta5S])) }));
  }

  function enviar() {
    start(async () => {
      const r = await guardar5S({ fecha, area, ubicacion: ubic, turno, supervisor: sup, respuestas: resp, hallazgos: hall, accion, fotos });
      setMsg({ ok: r.ok, t: r.mensaje });
      if (r.ok) {
        setResp({}); setHall(""); setAccion(""); setFotos([]); setUbic("");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Encabezado fijo con puntaje en vivo */}
      <div className="sticky top-0 z-10 rounded-xl border border-borde bg-tarjeta p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-suave">Puntaje en vivo</p>
            <p className={`text-2xl font-extrabold ${colorNivel(calc.nivel)}`}>{calc.total ?? "—"}% <span className="text-sm">{calc.nivel ?? ""}</span></p>
          </div>
          <p className="text-sm tabular-nums text-suave">{respondidas} / {total}</p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-fondo"><div className="h-full rounded-full bg-marca" style={{ width: `${(respondidas / total) * 100}%` }} /></div>
      </div>

      {msg && <p role="status" className={`rounded-xl p-3 text-sm font-semibold ${msg.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{msg.t}</p>}

      <section className="grid gap-3 rounded-xl bg-tarjeta p-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">Fecha<input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={campo} /></label>
        <label className="flex flex-col gap-1 text-sm">Turno
          <select value={turno} onChange={(e) => setTurno(e.target.value)} className={campo}>
            <option value="">—</option><option>Mañana</option><option>Tarde</option><option>Noche</option>
          </select></label>
        <label className="flex flex-col gap-1 text-sm">Área auditada *
          <input list="areas-5s" value={area} onChange={(e) => setArea(e.target.value.toUpperCase())} className={campo} />
          <datalist id="areas-5s">{areas.map((a) => <option key={a} value={a} />)}</datalist></label>
        <label className="flex flex-col gap-1 text-sm">Pasillo / ubicación / zona<input value={ubic} onChange={(e) => setUbic(e.target.value)} className={campo} /></label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">Supervisor responsable del área
          <input list="sup-5s" value={sup} onChange={(e) => setSup(e.target.value)} className={campo} />
          <datalist id="sup-5s">{supervisores.map((a) => <option key={a} value={a} />)}</datalist></label>
      </section>

      {BLOQUES_5S.map((b, bi) => (
        <section key={b.s} className="flex flex-col gap-4 rounded-xl bg-tarjeta p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold">{b.s}S · {b.nombre} <span className="ml-1 text-sm font-normal text-suave">{calc.porS[bi] != null ? `${calc.porS[bi]}%` : ""}</span></h2>
            <button type="button" onClick={() => todoCumple(b.s)} className="h-9 rounded-lg border border-borde px-3 text-xs font-semibold hover:border-green-600">✓ Todo cumple</button>
          </div>
          {b.items.map(([id, texto]) => (
            <fieldset key={id} className="flex flex-col gap-2 border-t border-borde pt-3 first-of-type:border-0 first-of-type:pt-0">
              <legend className="text-sm"><b>{id}</b> {texto}</legend>
              <div className="grid grid-cols-4 gap-1.5">
                {OPCIONES.map((o) => (
                  <button key={o.v} type="button" aria-pressed={resp[id] === o.v} onClick={() => setResp((r) => ({ ...r, [id]: o.v }))}
                    className={`h-11 rounded-lg border-2 text-xs font-bold sm:text-sm ${resp[id] === o.v ? o.c : "border-borde"}`}>{o.v}</button>))}
              </div>
            </fieldset>))}
        </section>))}

      <section className="flex flex-col gap-3 rounded-xl bg-tarjeta p-5">
        <label className="flex flex-col gap-1 text-sm">Hallazgos / observaciones<textarea rows={3} value={hall} onChange={(e) => setHall(e.target.value)} className="rounded-xl border border-borde bg-tarjeta p-3" /></label>
        <label className="flex flex-col gap-1 text-sm">Acción correctiva propuesta<textarea rows={2} value={accion} onChange={(e) => setAccion(e.target.value)} className="rounded-xl border border-borde bg-tarjeta p-3" /></label>
        <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-borde font-semibold">
          <Camera size={20} /> {subiendo ? "Subiendo…" : "Tomar / subir evidencia"}
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => e.target.files?.[0] && subirFoto(e.target.files[0])} />
        </label>
        {fotos.length > 0 && <p className="text-xs text-suave">📷 {fotos.length} foto(s) adjunta(s)</p>}
      </section>

      <button disabled={pend || subiendo || respondidas < total || !area.trim()} onClick={enviar}
        className="h-14 rounded-xl bg-marca text-lg font-bold text-white disabled:opacity-40">
        {pend ? "Guardando…" : respondidas < total ? `Faltan ${total - respondidas} ítems` : !area.trim() ? "Indica el área" : "Guardar auditoría"}
      </button>
    </div>
  );
}
