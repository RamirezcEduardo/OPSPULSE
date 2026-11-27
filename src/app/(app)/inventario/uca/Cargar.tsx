"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Database, Upload } from "lucide-react";
import { ACEPTA, leerArchivo } from "@/lib/parsers/archivo";
import { mapearPosiciones, resumirStockWms } from "@/lib/parsers/uca";
import { fmtNum } from "@/lib/formato";
import { ucaCerrar, ucaLimpiarStock, ucaPosiciones, ucaStock } from "./actions";

export function CargarUca({ hayMaestro }: { hayMaestro: boolean }) {
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [paso, setPaso] = useState<string | null>(null);
  const router = useRouter();
  const lotes = async (xs: Record<string, unknown>[], fn: (x: Record<string, unknown>[]) => Promise<{ ok: boolean; mensaje: string }>, et: string) => {
    for (let i = 0; i < xs.length; i += 2000) { setPaso(`${et} ${fmtNum(Math.min(i + 2000, xs.length))} / ${fmtNum(xs.length)}…`); const r = await fn(xs.slice(i, i + 2000)); if (!r.ok) throw new Error(r.mensaje); }
  };
  async function maestro(f: File) {
    setMsg(null); setPaso("Leyendo maestro…");
    try {
      const p = mapearPosiciones(await leerArchivo(f, "BASE_POSICIONES"));
      if (!p.length) throw new Error("No encontré la hoja BASE_POSICIONES (UBICACION, AREA, PASILLO, NIVEL, ALTURA).");
      await lotes(p, ucaPosiciones, "Guardando posiciones");
      setMsg({ ok: true, t: `Maestro cargado: ${fmtNum(p.length)} posiciones de reserva ✓` }); router.refresh();
    } catch (e) { setMsg({ ok: false, t: (e as Error).message }); } finally { setPaso(null); }
  }
  async function stock(f: File) {
    setMsg(null); setPaso("Leyendo archivo del WMS…");
    try {
      const r = resumirStockWms(await leerArchivo(f));
      if (!r.ubicaciones.length) throw new Error("No encontré ubicaciones (columna «Texto mostrado» o UBICACION).");
      const c = await ucaLimpiarStock(); if (!c.ok) throw new Error(c.mensaje);
      await lotes(r.ubicaciones, ucaStock, "Guardando stock");
      await ucaCerrar(r.corte, f.name, r.ubicaciones.length);
      setMsg({ ok: true, t: `Stock al ${r.corte ? new Date(r.corte).toLocaleString("es-PE", { timeZone: "America/Lima" }) : "—"}: ${fmtNum(r.filas)} líneas → ${fmtNum(r.ubicaciones.length)} ubicaciones ✓` }); router.refresh();
    } catch (e) { setMsg({ ok: false, t: (e as Error).message }); } finally { setPaso(null); }
  }
  const btn = "flex h-11 cursor-pointer items-center gap-2 rounded-lg px-4 text-sm font-semibold";
  return (
    <section className="rounded-xl bg-tarjeta p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-semibold">Cargar stock de reserva (WMS)</h2>
          <p className="text-sm text-suave">Sube el ReserveInventory del WMS tal cual. Se resume por ubicación (unidades, LPN, SKUs) y reemplaza la foto anterior; cada carga queda en el historial por día.</p></div>
        <div className="flex flex-wrap gap-2">
          <label className={`${btn} border border-borde`}><Database size={16} /> {hayMaestro ? "Actualizar maestro" : "Cargar maestro de posiciones"}
            <input type="file" accept={ACEPTA} className="sr-only" disabled={!!paso} onChange={(e) => { if (e.target.files?.[0]) maestro(e.target.files[0]); e.target.value = ""; }} /></label>
          <label className={`${btn} bg-marca text-white ${!hayMaestro ? "pointer-events-none opacity-50" : ""}`}><Upload size={16} /> Subir stock WMS
            <input type="file" accept={ACEPTA} className="sr-only" disabled={!!paso || !hayMaestro} onChange={(e) => { if (e.target.files?.[0]) stock(e.target.files[0]); e.target.value = ""; }} /></label>
        </div>
      </div>
      {!hayMaestro && <p className="mt-2 text-xs text-suave">Primero carga el maestro: el Excel UCA con la hoja BASE_POSICIONES (se carga una sola vez o cuando cambien las ubicaciones).</p>}
      {paso && <p className="mt-3 text-sm text-suave">{paso}</p>}
      {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-green-700" : "text-marca"}`}>{msg.t}</p>}
    </section>
  );
}
