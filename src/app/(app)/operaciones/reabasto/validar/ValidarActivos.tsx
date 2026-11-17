"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Fotos } from "@/components/Fotos";
import { validarActivo } from "../actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type A = Record<string, any>;

export function ValidarActivos({ filas, miNombre }: { filas: A[]; miNombre: string }) {
  const auditores = ["Todos", ...new Set(filas.map((f) => f.auditor_asignado).filter(Boolean))];
  const [aud, setAud] = useState(auditores.includes(miNombre) ? miNombre : "Todos");
  const [lista, setLista] = useState(filas);
  const visibles = useMemo(() => lista.filter((f) => aud === "Todos" || f.auditor_asignado === aud), [lista, aud]);
  const primera = Math.max(0, visibles.findIndex((f) => !f.validado_en));
  const [i, setI] = useState(primera);
  const a = visibles[Math.min(i, Math.max(0, visibles.length - 1))];
  const [sis, setSis] = useState<string>(a?.cant_sistema ?? "");
  const [fis, setFis] = useState<string>(a?.cant_fisica ?? "");
  const [obs, setObs] = useState<string>(a?.observacion ?? "");
  const [fotos, setFotos] = useState<string[]>(a?.fotos ?? []);
  const [msg, setMsg] = useState<string | null>(null);
  const [pend, start] = useTransition();
  const hechas = visibles.filter((f) => f.validado_en).length;

  function ir(n: number, base = visibles) {
    const x = base[n]; if (!x) return;
    setI(n); setSis(x.cant_sistema ?? ""); setFis(x.cant_fisica ?? ""); setObs(x.observacion ?? ""); setFotos(x.fotos ?? []); setMsg(null);
  }
  if (!a) return null;
  const dif = sis !== "" && fis !== "" ? Number(fis) - Number(sis) : null;

  function guardar() {
    start(async () => {
      const r = await validarActivo(a.id, Number(sis), Number(fis), obs, fotos);
      setMsg(r.mensaje);
      if (!r.ok) return;
      const nueva = lista.map((x) => x.id === a.id ? { ...x, cant_sistema: Number(sis), cant_fisica: Number(fis), diferencia: dif, observacion: obs, fotos, validado_en: new Date().toISOString() } : x);
      setLista(nueva);
      const vis = nueva.filter((f) => aud === "Todos" || f.auditor_asignado === aud);
      const sig = vis.findIndex((x, k) => k > i && !x.validado_en);
      if (sig >= 0) ir(sig, vis);
    });
  }
  const campo = "h-14 w-full rounded-xl border border-borde bg-tarjeta px-3 text-center text-2xl font-bold tabular-nums";

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-tarjeta p-4">
        <div className="flex justify-between text-sm"><span className="font-semibold">Validados</span><span className="tabular-nums">{hechas} / {visibles.length}</span></div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-fondo"><div className="h-full rounded-full bg-marca" style={{ width: `${(hechas / Math.max(1, visibles.length)) * 100}%` }} /></div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{auditores.map((x) => (
          <button key={x} onClick={() => { setAud(x); setI(0); setMsg(null); }} aria-pressed={aud === x}
            className={`h-9 shrink-0 rounded-full border px-4 text-sm ${aud === x ? "border-marca bg-marca text-white" : "border-borde"}`}>{x}</button>))}</div>
      </div>

      <article className="flex flex-col gap-4 rounded-xl bg-tarjeta p-5">
        <div className="flex justify-between text-xs text-suave">
          <span>{a.area} · {a.turno} · Auditor {a.auditor_asignado ?? "—"}</span>
          {a.validado_en && <span className={`rounded-full px-2 py-0.5 font-semibold ${Number(a.diferencia) === 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{Number(a.diferencia) === 0 ? "CONFORME" : "CON DIFERENCIA"}</span>}
        </div>
        <div>
          <p className="text-xs text-suave">Activo</p>
          <p className="font-mono text-3xl font-extrabold">{a.ubicacion}</p>
          <p className="mt-2 font-semibold">{a.cod_alternat} · {a.descripcion}</p>
          <p className="text-sm text-suave">Reabastecido por <b className="text-texto">{a.usuario_reabasto ?? "—"}</b></p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-1 text-center text-xs font-semibold text-suave">Cant. sistémica (WMS)
            <input type="number" inputMode="numeric" value={sis} onChange={(e) => setSis(e.target.value)} className={campo} /></label>
          <label className="flex flex-col gap-1 text-center text-xs font-semibold text-suave">Cant. física
            <input type="number" inputMode="numeric" value={fis} onChange={(e) => setFis(e.target.value)} className={campo} /></label>
          <div className="flex flex-col gap-1 text-center text-xs font-semibold text-suave">Diferencia
            <div className={`flex h-14 items-center justify-center rounded-xl text-2xl font-extrabold tabular-nums ${dif == null ? "bg-fondo text-suave" : dif === 0 ? "bg-green-600 text-white" : "bg-marca text-white"}`}>
              {dif == null ? "—" : dif > 0 ? `+${dif}` : dif}</div></div>
        </div>
        <textarea rows={3} placeholder="Observación" value={obs} onChange={(e) => setObs(e.target.value)} className="rounded-xl border border-borde bg-tarjeta p-3 text-sm" />
        <Fotos carpeta="reabasto" fotos={fotos} setFotos={setFotos} />
        <button disabled={pend || sis === "" || fis === ""} onClick={guardar}
          className={`h-14 rounded-xl text-lg font-bold text-white disabled:opacity-40 ${dif === 0 ? "bg-green-600" : "bg-marca"}`}>
          {pend ? "Guardando…" : "Guardar y siguiente"}</button>
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
