"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Fotos } from "@/components/Fotos";
import { fmtSoles } from "@/lib/formato";
import { verificarShortpick } from "../actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type L = Record<string, any>;
const ESTADOS = [
  { v: "completo", t: "Encontré todo", c: "bg-green-600 border-green-600" },
  { v: "parcial", t: "Encontré una parte", c: "bg-amber-500 border-amber-500" },
  { v: "no_encontrado", t: "No lo encontré", c: "bg-marca border-marca" },
  { v: "regularizado_manual", t: "Regularizado manual", c: "bg-neutral-600 border-neutral-600" },
];

export function BuscarShortpick({ lineas }: { lineas: L[] }) {
  const [area, setArea] = useState("Todas");
  const [hechas, setHechas] = useState<Set<number>>(new Set());
  const lista = useMemo(() => lineas.filter((l) => (area === "Todas" || l.area === area)), [lineas, area]);
  const [i, setI] = useState(0);
  const l = lista[Math.min(i, Math.max(0, lista.length - 1))];
  const [estado, setEstado] = useState<string | null>(null);
  const [cant, setCant] = useState("");
  const [ubic, setUbic] = useState("");
  const [coment, setComent] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [pend, start] = useTransition();
  const reset = () => { setEstado(null); setCant(""); setUbic(""); setComent(""); setFotos([]); setMsg(null); };
  const ir = (n: number) => { setI(Math.max(0, Math.min(n, lista.length - 1))); reset(); };
  const areas = ["Todas", ...new Set(lineas.map((x) => x.area).filter(Boolean))];
  if (!l) return null;
  const falt = Number(l.faltante);
  const cantidad = estado === "completo" || estado === "regularizado_manual" ? falt : estado === "no_encontrado" ? 0 : Number(cant || 0);
  const listo = estado && (estado !== "parcial" || (cantidad > 0 && cantidad < falt));

  function guardar() {
    start(async () => {
      const r = await verificarShortpick({ linea_id: l.id, estado: estado!, cantidad_encontrada: cantidad, ubicacion_encontrada: ubic.trim().toUpperCase() || null, fotos, comentario: coment || null });
      setMsg(r.mensaje);
      if (r.ok) { setHechas((h) => new Set(h).add(l.id)); const sig = lista.findIndex((x, k) => k > i && !hechas.has(x.id)); ir(sig >= 0 ? sig : i); }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-tarjeta p-4">
        <div className="flex justify-between text-sm"><span className="font-semibold">Buscadas</span><span className="tabular-nums">{hechas.size} / {lista.length}</span></div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-fondo"><div className="h-full rounded-full bg-marca" style={{ width: `${(hechas.size / Math.max(1, lista.length)) * 100}%` }} /></div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{areas.map((a) => (
          <button key={a} onClick={() => { setArea(a); setI(0); reset(); }} aria-pressed={area === a} className={`h-9 shrink-0 rounded-full border px-4 text-sm ${area === a ? "border-marca bg-marca text-white" : "border-borde"}`}>{a}</button>))}</div>
      </div>
      <article className="flex flex-col gap-4 rounded-xl bg-tarjeta p-5">
        <div className="flex justify-between text-xs text-suave"><span>{l.dia}</span>{hechas.has(l.id) && <span className="font-semibold text-green-700">✓ Registrado</span>}</div>
        <div>
          <p className="text-xs text-suave">Ubicación del shortpick</p>
          <p className="font-mono text-3xl font-extrabold">{l.ubicacion}</p>
          <p className="mt-2 font-semibold">{l.cod_alternat} · {l.descripcion}</p>
          <p className="text-sm text-suave">Faltante <b className="text-texto">{falt} und</b> · {fmtSoles(Number(l.valor))}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">{ESTADOS.map((e) => (
          <button key={e.v} onClick={() => setEstado(e.v)} aria-pressed={estado === e.v}
            className={`h-16 rounded-xl border-2 text-sm font-bold ${estado === e.v ? `${e.c} text-white` : "border-borde"}`}>{e.t}</button>))}</div>
        {estado === "parcial" && (
          <label className="flex flex-col gap-1 text-sm">¿Cuántas unidades encontraste? (de {falt})
            <input type="number" inputMode="numeric" value={cant} onChange={(e) => setCant(e.target.value)} className="h-12 rounded-xl border border-borde bg-tarjeta px-3 text-lg" /></label>)}
        {(estado === "completo" || estado === "parcial") && (
          <label className="flex flex-col gap-1 text-sm">¿En qué ubicación estaba? (si fue en otra)
            <input value={ubic} onChange={(e) => setUbic(e.target.value)} autoCapitalize="characters" placeholder={l.ubicacion} className="h-12 rounded-xl border border-borde bg-tarjeta px-3 font-mono" /></label>)}
        <Fotos carpeta="shortpick" fotos={fotos} setFotos={setFotos} />
        <textarea rows={2} placeholder="Comentario (opcional)" value={coment} onChange={(e) => setComent(e.target.value)} className="rounded-xl border border-borde bg-tarjeta p-3 text-sm" />
        <button disabled={!listo || pend} onClick={guardar} className="h-14 rounded-xl bg-marca text-lg font-bold text-white disabled:opacity-40">{pend ? "Guardando…" : "Guardar y siguiente"}</button>
        {msg && <p role="status" className="text-center text-sm">{msg}</p>}
      </article>
      <div className="flex justify-between">
        <button onClick={() => ir(i - 1)} disabled={i === 0} className="flex h-11 items-center gap-1 rounded-lg border border-borde bg-tarjeta px-4 disabled:opacity-40"><ChevronLeft size={18} /> Anterior</button>
        <span className="self-center text-sm text-suave">{i + 1} de {lista.length}</span>
        <button onClick={() => ir(i + 1)} disabled={i >= lista.length - 1} className="flex h-11 items-center gap-1 rounded-lg border border-borde bg-tarjeta px-4 disabled:opacity-40">Siguiente <ChevronRight size={18} /></button>
      </div>
    </div>
  );
}
