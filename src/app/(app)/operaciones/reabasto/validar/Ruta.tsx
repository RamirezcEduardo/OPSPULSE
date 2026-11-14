"use client";

import { useMemo, useState, useTransition } from "react";
import { Camera, Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { guardarValidacion } from "./actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tarea = Record<string, any>;

function SiNo({ label, valor, set }: { label: string; valor: boolean | null; set: (v: boolean) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 font-semibold">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        {[true, false].map((v) => (
          <button key={String(v)} type="button" onClick={() => set(v)} aria-pressed={valor === v}
            className={`flex h-14 items-center justify-center gap-2 rounded-xl border-2 text-lg font-bold ${valor === v
              ? v ? "border-green-600 bg-green-600 text-white" : "border-marca bg-marca text-white"
              : "border-borde"}`}>
            {v ? <Check size={20} /> : <X size={20} />} {v ? "Sí" : "No"}
          </button>))}
      </div>
    </fieldset>
  );
}

export function Ruta({ tareas, usuarios }: { tareas: Tarea[]; usuarios: string[] }) {
  const [area, setArea] = useState("Todas");
  const [lista, setLista] = useState(tareas);
  const visibles = useMemo(() => lista.filter((t) => area === "Todas" || t.area === area), [lista, area]);
  const primeraSin = Math.max(0, visibles.findIndex((t) => t.validacion === "SIN VALIDAR"));
  const [i, setI] = useState(primeraSin);
  const t = visibles[Math.min(i, visibles.length - 1)];
  const hechas = visibles.filter((x) => x.validacion !== "SIN VALIDAR").length;

  const [prod, setProd] = useState<boolean | null>(t?.producto_en_ubic ?? null);
  const [cant, setCant] = useState<boolean | null>(t?.cantidad_completa ?? null);
  const [encontrada, setEncontrada] = useState<string>(t?.cant_encontrada ?? "");
  const [resp, setResp] = useState<string>(t?.usuario_responsable ?? t?.usuario_tarea ?? "");
  const [coment, setComent] = useState<string>(t?.comentario ?? "");
  const [fotos, setFotos] = useState<string[]>(t?.fotos ?? []);
  const [subiendo, setSubiendo] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pend, start] = useTransition();

  function ir(n: number) {
    const x = visibles[n]; if (!x) return;
    setI(n); setProd(x.producto_en_ubic ?? null); setCant(x.cantidad_completa ?? null);
    setEncontrada(x.cant_encontrada ?? ""); setResp(x.usuario_responsable ?? x.usuario_tarea ?? "");
    setComent(x.comentario ?? ""); setFotos(x.fotos ?? []); setMsg(null);
  }

  async function subirFoto(f: File) {
    setSubiendo(true);
    const ruta = `reabasto/${new Date().toISOString().slice(0, 10)}/${t.clave.replace(/[^\w-]/g, "_")}-${Date.now()}.${f.name.split(".").pop() || "jpg"}`;
    const { error } = await createClient().storage.from("fotos").upload(ruta, f, { contentType: f.type });
    setSubiendo(false);
    if (error) return setMsg(`No se pudo subir la foto: ${error.message}`);
    setFotos((p) => [...p, ruta]);
  }

  const ok = prod === true && cant === true;
  const listo = prod !== null && cant !== null && (ok || resp.trim() !== "");

  function guardar() {
    start(async () => {
      const r = await guardarValidacion({
        clave: t.clave, producto_en_ubic: prod!, cantidad_completa: cant!,
        cant_encontrada: cant ? null : encontrada === "" ? null : Number(encontrada),
        usuario_responsable: ok ? null : resp, comentario: coment, fotos,
      });
      setMsg(r.mensaje);
      if (!r.ok) return;
      setLista((l) => l.map((x) => x.clave === t.clave ? { ...x, producto_en_ubic: prod, cantidad_completa: cant, cant_encontrada: encontrada, usuario_responsable: ok ? null : resp, comentario: coment, fotos, validacion: ok ? "CONFORME" : "PENDIENTE" } : x));
      const sig = visibles.findIndex((x, k) => k > i && x.validacion === "SIN VALIDAR");
      if (sig >= 0) ir(sig);
    });
  }

  const areas = ["Todas", ...new Set(lista.map((x) => x.area).filter(Boolean))];
  if (!t) return null;
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-tarjeta p-4">
        <div className="flex items-center justify-between text-sm"><span className="font-semibold">Progreso</span><span className="tabular-nums">{hechas} / {visibles.length}</span></div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-fondo"><div className="h-full rounded-full bg-marca" style={{ width: `${(hechas / Math.max(1, visibles.length)) * 100}%` }} /></div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {areas.map((a) => (
            <button key={a} onClick={() => { setArea(a); setI(0); }} aria-pressed={area === a}
              className={`h-9 shrink-0 rounded-full border px-4 text-sm ${area === a ? "border-marca bg-marca text-white" : "border-borde"}`}>{a}</button>))}
        </div>
      </div>

      <article className="flex flex-col gap-5 rounded-xl bg-tarjeta p-5">
        <div className="flex items-center justify-between text-xs text-suave">
          <span>{t.motivo_seleccion} · {t.tipo_asignac} · {t.estado_tarea}</span>
          <span className={`rounded-full px-2 py-0.5 font-semibold ${t.validacion === "CONFORME" ? "bg-green-100 text-green-800" : t.validacion === "PENDIENTE" ? "bg-red-100 text-red-800" : "bg-fondo"}`}>{t.validacion}</span>
        </div>
        <div>
          <p className="text-xs text-suave">Ubicación destino</p>
          <p className="font-mono text-3xl font-extrabold tracking-tight">{t.ubic_destino}</p>
          <p className="mt-2 font-semibold">{t.cod_alternat} · {t.descripcion}</p>
          <p className="text-sm text-suave">Cantidad asignada <b className="text-texto">{t.cantidad}</b> · Lote {t.lote ?? "—"} · Usuario {t.usuario_tarea ?? "—"}</p>
        </div>

        <SiNo label="¿El producto está en la ubicación?" valor={prod} set={setProd} />
        <SiNo label={`¿Está la cantidad asignada (${t.cantidad})?`} valor={cant} set={setCant} />
        {cant === false && (
          <label className="flex flex-col gap-1 text-sm">¿Cuántas unidades encontraste?
            <input type="number" inputMode="numeric" value={encontrada} onChange={(e) => setEncontrada(e.target.value)} className="h-12 rounded-xl border border-borde bg-tarjeta px-3 text-lg" />
          </label>)}

        {prod !== null && cant !== null && !ok && (
          <label className="flex flex-col gap-1 text-sm font-semibold">Usuario responsable del reabasto *
            <input list="usuarios-reabasto" value={resp} onChange={(e) => setResp(e.target.value)} autoCapitalize="none"
              className="h-12 rounded-xl border-2 border-marca bg-tarjeta px-3 text-base font-normal" />
            <datalist id="usuarios-reabasto">{usuarios.map((u) => <option key={u} value={u} />)}</datalist>
            <span className="text-xs font-normal text-suave">Quedará como PENDIENTE y se sumará a las incidencias de este usuario.</span>
          </label>)}

        <div className="flex flex-col gap-2">
          <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-borde font-semibold">
            <Camera size={20} /> {subiendo ? "Subiendo…" : "Tomar / subir foto"}
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => e.target.files?.[0] && subirFoto(e.target.files[0])} />
          </label>
          {fotos.length > 0 && <p className="text-xs text-suave">📷 {fotos.length} foto(s) adjunta(s)</p>}
        </div>
        <textarea placeholder="Comentario (opcional)" rows={2} value={coment} onChange={(e) => setComent(e.target.value)} className="rounded-xl border border-borde bg-tarjeta p-3 text-sm" />

        <button disabled={!listo || pend || subiendo} onClick={guardar}
          className={`h-14 rounded-xl text-lg font-bold text-white disabled:opacity-40 ${ok ? "bg-green-600" : "bg-marca"}`}>
          {pend ? "Guardando…" : ok ? "✓ OK — Conforme" : "Guardar como pendiente"}
        </button>
        {msg && <p role="status" className="text-center text-sm">{msg}</p>}
      </article>

      <div className="flex justify-between">
        <button onClick={() => ir(i - 1)} disabled={i === 0} className="flex h-11 items-center gap-1 rounded-lg border border-borde bg-tarjeta px-4 disabled:opacity-40"><ChevronLeft size={18} /> Anterior</button>
        <span className="self-center text-sm text-suave">{i + 1} de {visibles.length}</span>
        <button onClick={() => ir(i + 1)} disabled={i >= visibles.length - 1} className="flex h-11 items-center gap-1 rounded-lg border border-borde bg-tarjeta px-4 disabled:opacity-40">Siguiente <ChevronRight size={18} /></button>
      </div>
    </div>
  );
}
