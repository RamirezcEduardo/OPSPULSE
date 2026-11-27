"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { ACEPTA, leerArchivo } from "@/lib/parsers/archivo";
import { COLS_MERMA, mapearMerma } from "@/lib/parsers/merma";
import { fmtNum, fmtSoles } from "@/lib/formato";
import { mermaIniciar, mermaLote, mermaTerminar } from "./actions";

export function CargarMerma() {
  const [prev, setPrev] = useState<{ archivo: string; total: number; filas: ReturnType<typeof mapearMerma> } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [paso, setPaso] = useState<string | null>(null);
  const router = useRouter();
  async function leer(f: File) {
    setMsg(null); setPrev(null); setPaso("Leyendo…");
    try {
      const filas = await leerArchivo(f);
      const falta = filas.length ? COLS_MERMA.filter((c) => !(c in filas[0])) : COLS_MERMA;
      if (falta.length) return setMsg({ ok: false, t: `No es la hoja DATA de merma. Faltan: ${falta.join(", ")}` });
      setPrev({ archivo: f.name, total: filas.length, filas: mapearMerma(filas) });
    } catch (e) { setMsg({ ok: false, t: (e as Error).message }); } finally { setPaso(null); }
  }
  async function cargar() {
    if (!prev) return;
    try {
      const c = await mermaIniciar(prev.archivo, prev.total);
      for (let i = 0; i < prev.filas.length; i += 1000) {
        setPaso(`Guardando ${fmtNum(Math.min(i + 1000, prev.filas.length))} / ${fmtNum(prev.filas.length)}…`);
        const r = await mermaLote(prev.filas.slice(i, i + 1000), c); if (!r.ok) throw new Error(r.mensaje);
      }
      await mermaTerminar(c, prev.filas.length);
      setMsg({ ok: true, t: `${fmtNum(prev.filas.length)} LPN de merma cargados ✓ (los repetidos se actualizan)` }); setPrev(null); router.refresh();
    } catch (e) { setMsg({ ok: false, t: (e as Error).message }); } finally { setPaso(null); }
  }
  return (
    <section className="rounded-xl bg-tarjeta p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-semibold">Cargar merma</h2><p className="text-sm text-suave">Hoja DATA del EVOLUTIVO DE MERMA (Excel o CSV). Solo se guardan fecha, LPN, SKU, descripción, unidades, área, familia, valor y origen. Lo ya cargado no se duplica.</p></div>
        <label className="flex h-11 cursor-pointer items-center gap-2 rounded-lg bg-marca px-4 text-sm font-semibold text-white"><Upload size={16} /> Elegir archivo
          <input type="file" accept={ACEPTA} className="sr-only" disabled={!!paso} onChange={(e) => e.target.files?.[0] && leer(e.target.files[0])} /></label>
      </div>
      {prev && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-borde p-3 text-sm">
          <span className="font-medium">{prev.archivo}</span><span>{fmtNum(prev.filas.length)} LPN</span><span>{fmtSoles(prev.filas.reduce((a, x) => a + x.valor, 0))}</span>
          <div className="ml-auto flex gap-2"><button onClick={() => setPrev(null)} className="h-10 rounded-lg border border-borde px-3">Cancelar</button>
            <button disabled={!!paso} onClick={cargar} className="h-10 rounded-lg bg-marca px-4 font-semibold text-white disabled:opacity-60">Confirmar carga</button></div>
        </div>)}
      {paso && <p className="mt-3 text-sm text-suave">{paso}</p>}
      {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-green-700" : "text-marca"}`}>{msg.t}</p>}
    </section>
  );
}
