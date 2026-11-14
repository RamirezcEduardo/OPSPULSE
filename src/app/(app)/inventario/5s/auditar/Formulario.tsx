"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Camera, Check, ChevronLeft, ChevronRight, Minus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BLOQUES_5S, calcular5S, type Respuesta5S } from "@/lib/reglas/cincoS";
import { guardar5S } from "../actions";

const ITEMS = BLOQUES_5S.flatMap((b) => b.items.map(([id, txt]) => ({ id, txt, s: b.s, bloque: b.nombre })));
const OPCIONES: { v: Respuesta5S; c: string; icon: React.ReactNode; atajo: string }[] = [
  { v: "Cumple", c: "bg-green-600 border-green-600", icon: <Check size={28} />, atajo: "1" },
  { v: "Parcial", c: "bg-amber-500 border-amber-500", icon: <Minus size={28} />, atajo: "2" },
  { v: "No cumple", c: "bg-marca border-marca", icon: <X size={28} />, atajo: "3" },
  { v: "N.A.", c: "bg-neutral-500 border-neutral-500", icon: <span className="text-2xl font-black leading-none">∅</span>, atajo: "4" },
];
const campo = "h-14 w-full rounded-2xl border border-borde bg-tarjeta px-4 text-lg";
const colorNivel = (n: string | null) =>
  n === "EXCELENTE" ? "text-green-600" : n === "BUENO" ? "text-blue-600" : n === "REGULAR" ? "text-amber-600" : n ? "text-marca" : "text-suave";
const vibrar = () => { try { navigator.vibrate?.(15); } catch {} };
const BORRADOR = "opspulse-5s-borrador";

type Paso = { tipo: "datos" } | { tipo: "item"; i: number } | { tipo: "cierre" };

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
  const [paso, setPaso] = useState<Paso>({ tipo: "datos" });
  const [subiendo, setSubiendo] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pend, start] = useTransition();
  const [listo, setListo] = useState(false);

  // Borrador local: si se cierra el navegador o se va la señal, no se pierde lo avanzado
  useEffect(() => {
    try {
      const b = JSON.parse(localStorage.getItem(BORRADOR) ?? "null");
      if (b?.fecha === hoy) { setArea(b.area ?? ""); setUbic(b.ubic ?? ""); setTurno(b.turno ?? ""); setSup(b.sup ?? ""); setResp(b.resp ?? {}); setHall(b.hall ?? ""); setAccion(b.accion ?? ""); setFotos(b.fotos ?? []); }
    } catch {}
    setListo(true);
  }, [hoy]);
  useEffect(() => {
    if (!listo) return;
    try { localStorage.setItem(BORRADOR, JSON.stringify({ fecha, area, ubic, turno, sup, resp, hall, accion, fotos })); } catch {}
  }, [listo, fecha, area, ubic, turno, sup, resp, hall, accion, fotos]);

  const respondidas = Object.keys(resp).length;
  const calc = useMemo(() => calcular5S(resp), [resp]);
  const pct = Math.round((respondidas / ITEMS.length) * 100);

  function responder(i: number, v: Respuesta5S) {
    vibrar();
    const nuevo = { ...resp, [ITEMS[i].id]: v };
    setResp(nuevo);
    // Parcial / No cumple: se queda para que tome la foto; Cumple / N.A.: avanza solo
    if (v === "Parcial" || v === "No cumple") return;
    setTimeout(() => {
      let sig = ITEMS.findIndex((it, k) => k > i && !nuevo[it.id]);
      if (sig < 0) sig = ITEMS.findIndex((it) => !nuevo[it.id]);
      setPaso(sig >= 0 ? { tipo: "item", i: sig } : { tipo: "cierre" });
    }, 200);
  }
  function siguiente(i: number) {
    let sig = ITEMS.findIndex((it, k) => k > i && !resp[it.id]);
    if (sig < 0) sig = i + 1 < ITEMS.length ? i + 1 : -1;
    setPaso(sig >= 0 ? { tipo: "item", i: sig } : { tipo: "cierre" });
  }
  function todoCumpleS(s: number) {
    vibrar();
    const nuevo = { ...resp, ...Object.fromEntries(ITEMS.filter((x) => x.s === s).map((x) => [x.id, "Cumple" as Respuesta5S])) };
    setResp(nuevo);
    const sig = ITEMS.findIndex((it) => !nuevo[it.id]);
    setPaso(sig >= 0 ? { tipo: "item", i: sig } : { tipo: "cierre" });
  }

  // Atajos de teclado (útil en tablet con teclado)
  useEffect(() => {
    if (paso.tipo !== "item") return;
    const h = (e: KeyboardEvent) => {
      const o = OPCIONES.find((x) => x.atajo === e.key); if (o) responder(paso.i, o.v);
      if (e.key === "ArrowLeft" && paso.i > 0) setPaso({ tipo: "item", i: paso.i - 1 });
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  });

  async function subirFoto(f: File) {
    setSubiendo(true);
    const ruta = `5s/${fecha}/${(area || "area").replace(/[^\w-]/g, "_")}-${Date.now()}.${f.name.split(".").pop() || "jpg"}`;
    const { error } = await createClient().storage.from("fotos").upload(ruta, f, { contentType: f.type });
    setSubiendo(false);
    if (error) return setMsg({ ok: false, t: `No se pudo subir la foto: ${error.message}` });
    vibrar(); setFotos((p) => [...p, ruta]);
  }

  function enviar() {
    start(async () => {
      const r = await guardar5S({ fecha, area, ubicacion: ubic, turno, supervisor: sup, respuestas: resp, hallazgos: hall, accion, fotos });
      setMsg({ ok: r.ok, t: r.mensaje });
      if (r.ok) {
        try { localStorage.removeItem(BORRADOR); } catch {}
        setResp({}); setHall(""); setAccion(""); setFotos([]); setUbic(""); setPaso({ tipo: "datos" });
      }
    });
  }

  const Foto = ({ texto = "Foto de evidencia" }: { texto?: string }) => (
    <label className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-borde text-base font-semibold active:scale-[.98]">
      <Camera size={22} /> {subiendo ? "Subiendo…" : texto} {fotos.length > 0 && <span className="rounded-full bg-marca px-2 text-xs text-white">{fotos.length}</span>}
      <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => e.target.files?.[0] && subirFoto(e.target.files[0])} />
    </label>
  );

  // Barra superior fija: progreso + puntaje
  const Barra = (
    <div className="sticky top-0 z-20 -mx-4 bg-fondo/95 px-4 pb-3 pt-2 backdrop-blur md:mx-0 md:px-0">
      <div className="flex items-center justify-between">
        <span className={`text-2xl font-extrabold tabular-nums ${colorNivel(calc.nivel)}`}>{calc.total ?? "—"}<span className="text-base">%</span></span>
        <span className="text-xs font-semibold text-suave">{calc.nivel ?? "SIN PUNTAJE"}</span>
        <span className="text-sm tabular-nums text-suave">{respondidas}/{ITEMS.length}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-tarjeta"><div className="h-full rounded-full bg-marca transition-all" style={{ width: `${pct}%` }} /></div>
      {/* mapa de ítems: toque para saltar */}
      <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
        {ITEMS.map((it, k) => {
          const v = resp[it.id];
          const actual = paso.tipo === "item" && paso.i === k;
          return (
            <button key={it.id} onClick={() => setPaso({ tipo: "item", i: k })} aria-label={`Ítem ${it.id}${v ? `: ${v}` : ""}`}
              className={`h-7 min-w-9 shrink-0 rounded-md text-[11px] font-bold ${actual ? "ring-2 ring-texto" : ""} ${
                v === "Cumple" ? "bg-green-600 text-white" : v === "Parcial" ? "bg-amber-500 text-white" : v === "No cumple" ? "bg-marca text-white" : v === "N.A." ? "bg-neutral-500 text-white" : "bg-tarjeta text-suave"}`}>
              {it.id}
            </button>);
        })}
      </div>
    </div>
  );

  if (paso.tipo === "datos") {
    return (
      <div className="flex flex-col gap-4">
        {msg && <p role="status" className={`rounded-2xl p-4 text-base font-semibold ${msg.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{msg.t}</p>}
        {respondidas > 0 && <p className="rounded-2xl bg-tarjeta p-3 text-sm">Tienes una auditoría en curso ({respondidas}/{ITEMS.length}). Continúa donde te quedaste.</p>}
        <div className="flex flex-col gap-3 rounded-2xl bg-tarjeta p-5">
          <p className="text-sm font-semibold text-suave">¿Dónde auditas?</p>
          <input list="areas-5s" placeholder="Área *" value={area} onChange={(e) => setArea(e.target.value.toUpperCase())} className={campo} />
          <datalist id="areas-5s">{areas.map((a) => <option key={a} value={a} />)}</datalist>
          <div className="flex flex-wrap gap-2">
            {areas.slice(0, 8).map((a) => (
              <button key={a} onClick={() => { vibrar(); setArea(a); }} className={`h-10 rounded-full border px-3 text-sm ${area === a ? "border-marca bg-marca text-white" : "border-borde"}`}>{a}</button>))}
          </div>
          <input placeholder="Pasillo / zona (opcional)" value={ubic} onChange={(e) => setUbic(e.target.value)} className={campo} />
          <div className="grid grid-cols-3 gap-2">
            {["Mañana", "Tarde", "Noche"].map((t) => (
              <button key={t} onClick={() => { vibrar(); setTurno(t); }} className={`h-12 rounded-xl border-2 font-semibold ${turno === t ? "border-marca bg-marca text-white" : "border-borde"}`}>{t}</button>))}
          </div>
          <input list="sup-5s" placeholder="Supervisor del área" value={sup} onChange={(e) => setSup(e.target.value)} className={campo} />
          <datalist id="sup-5s">{supervisores.map((a) => <option key={a} value={a} />)}</datalist>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={campo} />
        </div>
        <button disabled={!area.trim()} onClick={() => { vibrar(); const k = ITEMS.findIndex((it) => !resp[it.id]); setPaso(k >= 0 ? { tipo: "item", i: k } : { tipo: "cierre" }); }}
          className="h-16 rounded-2xl bg-marca text-xl font-bold text-white disabled:opacity-40">
          {respondidas ? "Continuar →" : "Comenzar →"}
        </button>
      </div>
    );
  }

  if (paso.tipo === "item") {
    const it = ITEMS[paso.i];
    const primeroDeS = ITEMS.findIndex((x) => x.s === it.s) === paso.i;
    return (
      <div className="flex min-h-[calc(100dvh-9rem)] flex-col gap-4">
        {Barra}
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-tarjeta px-3 py-1 text-xs font-bold">{it.s}S · {it.bloque}</span>
          {primeroDeS && <button onClick={() => todoCumpleS(it.s)} className="h-9 rounded-full border border-green-600 px-3 text-xs font-bold text-green-700 dark:text-green-400">✓ Toda la {it.s}S cumple</button>}
        </div>
        <div className="flex flex-1 flex-col justify-center rounded-3xl bg-tarjeta p-5">
          <p className="text-sm font-bold text-marca">{it.id}</p>
          <p className="mt-2 text-xl font-bold leading-snug">{it.txt}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {OPCIONES.map((o) => {
            const sel = resp[it.id] === o.v;
            return (
              <button key={o.v} onClick={() => responder(paso.i, o.v)} aria-pressed={sel}
                className={`flex h-20 flex-col items-center justify-center gap-1 rounded-2xl border-2 text-lg font-bold transition active:scale-95 ${sel ? `${o.c} text-white` : "border-borde bg-tarjeta"}`}>
                {o.icon}{o.v}
              </button>);
          })}
        </div>
        {(resp[it.id] === "No cumple" || resp[it.id] === "Parcial") && (
          <div className="flex flex-col gap-2">
            <Foto texto="Foto del incumplimiento" />
            <button onClick={() => siguiente(paso.i)} className="h-14 rounded-2xl bg-texto text-lg font-bold text-fondo">Siguiente →</button>
          </div>)}
        <div className="flex justify-between">
          <button onClick={() => setPaso(paso.i > 0 ? { tipo: "item", i: paso.i - 1 } : { tipo: "datos" })} className="flex h-12 items-center gap-1 rounded-xl px-3 text-suave"><ChevronLeft /> Atrás</button>
          <button onClick={() => setPaso(paso.i + 1 < ITEMS.length ? { tipo: "item", i: paso.i + 1 } : { tipo: "cierre" })} className="flex h-12 items-center gap-1 rounded-xl px-3 text-suave">{paso.i + 1 < ITEMS.length ? "Saltar" : "Resumen"} <ChevronRight /></button>
        </div>
      </div>
    );
  }

  // Cierre
  const faltan = ITEMS.filter((it) => !resp[it.id]);
  return (
    <div className="flex flex-col gap-4">
      {Barra}
      <section className="rounded-2xl bg-tarjeta p-5">
        <p className="text-sm text-suave">{area} {ubic && `· ${ubic}`} {turno && `· ${turno}`}</p>
        <p className={`mt-1 text-4xl font-extrabold ${colorNivel(calc.nivel)}`}>{calc.total ?? "—"}%</p>
        <p className={`font-bold ${colorNivel(calc.nivel)}`}>{calc.nivel}</p>
        <div className="mt-4 grid grid-cols-5 gap-2 text-center">
          {BLOQUES_5S.map((b, k) => (
            <div key={b.s} className="rounded-xl bg-fondo p-2"><p className="text-xs text-suave">{b.s}S</p><p className="font-bold tabular-nums">{calc.porS[k] ?? "—"}</p></div>))}
        </div>
      </section>
      {faltan.length > 0 && (
        <button onClick={() => setPaso({ tipo: "item", i: ITEMS.indexOf(faltan[0]) })} className="rounded-2xl bg-amber-100 p-4 text-left font-semibold text-amber-900">
          ⚠️ Faltan {faltan.length} ítems: {faltan.map((f) => f.id).join(", ")} → tocar para responder
        </button>)}
      <section className="flex flex-col gap-3 rounded-2xl bg-tarjeta p-5">
        <textarea placeholder="Hallazgos / observaciones" rows={3} value={hall} onChange={(e) => setHall(e.target.value)} className="rounded-2xl border border-borde bg-tarjeta p-4 text-base" />
        <textarea placeholder="Acción correctiva propuesta" rows={2} value={accion} onChange={(e) => setAccion(e.target.value)} className="rounded-2xl border border-borde bg-tarjeta p-4 text-base" />
        <Foto />
      </section>
      {msg && !msg.ok && <p role="alert" className="rounded-2xl bg-red-100 p-4 font-semibold text-red-800">{msg.t}</p>}
      <button disabled={pend || subiendo || faltan.length > 0} onClick={enviar} className="h-16 rounded-2xl bg-marca text-xl font-bold text-white disabled:opacity-40">
        {pend ? "Guardando…" : "Guardar auditoría ✓"}
      </button>
      <button onClick={() => setPaso({ tipo: "datos" })} className="h-12 text-suave">Editar datos del área</button>
    </div>
  );
}
