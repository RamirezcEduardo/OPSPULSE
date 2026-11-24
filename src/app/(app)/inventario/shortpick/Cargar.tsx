"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { ACEPTA, leerArchivo } from "@/lib/parsers/archivo";
import { COLS_SP_MES, resumirShortpickMes } from "@/lib/parsers/shortpickMes";
import { fmtNum } from "@/lib/formato";
import { spIniciar, spLote, spTerminar } from "./actions";

export function CargarShortpick({ cargados }: { cargados: string[] }) {
  const [prev, setPrev] = useState<{ archivo: string; r: ReturnType<typeof resumirShortpickMes> } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [paso, setPaso] = useState<string | null>(null);
  const router = useRouter();
  async function leer(f: File) {
    setMsg(null); setPrev(null); setPaso("Leyendo archivo…");
    try {
      const filas = await leerArchivo(f);
      const falta = filas.length ? COLS_SP_MES.filter((c) => !(c in filas[0])) : COLS_SP_MES;
      if (falta.length) return setMsg({ ok: false, t: `No es el formato de shortpick (hoja DATA). Faltan: ${falta.join(", ")}` });
      setPrev({ archivo: f.name, r: resumirShortpickMes(filas) });
    } catch (e) { setMsg({ ok: false, t: (e as Error).message }); } finally { setPaso(null); }
  }
  async function cargar() {
    if (!prev) return;
    const { r } = prev;
    try {
      setPaso("Preparando…");
      const c = await spIniciar(r.mes, prev.archivo, r.filas);
      if (!c.ok) throw new Error(c.mensaje);
      for (let i = 0; i < r.movs.length; i += 1000) {
        setPaso(`Guardando ${fmtNum(Math.min(i + 1000, r.movs.length))} / ${fmtNum(r.movs.length)}…`);
        const x = await spLote(c.id, r.movs.slice(i, i + 1000));
        if (!x.ok) throw new Error(x.mensaje);
      }
      await spTerminar(c.id, r.movs.length);
      setMsg({ ok: true, t: `Shortpick ${r.mes} cargado ✓ (también entra a la bolsa)` }); setPrev(null); router.refresh();
    } catch (e) { setMsg({ ok: false, t: `Error: ${(e as Error).message}` }); } finally { setPaso(null); }
  }
  return (
    <section className="rounded-xl bg-tarjeta p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-semibold">Cargar shortpick del mes</h2>
          <p className="text-sm text-suave">Archivo mensual de shortpick (hoja DATA, Excel o CSV). Se toman los códigos 4 y 17; si el mes ya existe, se reemplaza.</p></div>
        <label className="flex h-11 cursor-pointer items-center gap-2 rounded-lg bg-marca px-4 text-sm font-semibold text-white"><Upload size={16} /> Elegir archivo
          <input type="file" accept={ACEPTA} className="sr-only" disabled={!!paso} onChange={(e) => e.target.files?.[0] && leer(e.target.files[0])} /></label>
      </div>
      {prev && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-borde p-3 text-sm">
          <span className="font-medium">{prev.archivo}</span>
          <span>Mes <b>{prev.r.mes}</b>{cargados.includes(prev.r.mes) && <span className="ml-1 text-amber-700">(ya cargado: se reemplazará)</span>}</span>
          <span>{fmtNum(prev.r.filas)} filas</span><span>{fmtNum(prev.r.movs.length)} líneas de shortpick</span>
          <div className="ml-auto flex gap-2">
            <button onClick={() => setPrev(null)} className="h-10 rounded-lg border border-borde px-3">Cancelar</button>
            <button disabled={!!paso} onClick={cargar} className="h-10 rounded-lg bg-marca px-4 font-semibold text-white disabled:opacity-60">Confirmar carga</button>
          </div>
        </div>)}
      {paso && <p className="mt-3 text-sm text-suave">{paso}</p>}
      {msg && <p role="status" className={`mt-3 text-sm ${msg.ok ? "text-green-700 dark:text-green-400" : "text-marca-oscuro"}`}>{msg.t}</p>}
    </section>
  );
}
