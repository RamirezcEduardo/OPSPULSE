"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { ACEPTA, leerArchivo } from "@/lib/parsers/archivo";
import { fmtNum } from "@/lib/formato";
import { cargarUbicaciones, terminarUbicaciones } from "./ubicaciones";

const busca = (h: string[], ...ops: RegExp[]) => h.find((k) => ops.some((o) => o.test(k)));

/** Maestro de ubicaciones del WMS: Ubicación + Área (y opcional UBI / Subárea). Da el área al shortpick y a la bolsa. */
export function CargarUbicaciones() {
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [paso, setPaso] = useState<string | null>(null);
  async function leer(f: File) {
    setMsg(null); setPaso("Leyendo…");
    try {
      const filas = await leerArchivo(f);
      const h = Object.keys(filas[0] ?? {});
      const cU = busca(h, /^ubicaci[oó]n$/i, /^ubicacion$/i, /^locn/i, /^ubic$/i);
      const cA = busca(h, /^[áa]rea$/i, /^ubic_area$/i, /^zona$/i, /^area/i);
      if (!cU || !cA) return setMsg({ ok: false, t: `Necesito una columna de ubicación y otra de área. Encontré: ${h.join(", ")}` });
      const cB = busca(h, /^ubi$/i, /^tipo/i), cS = busca(h, /sub.?[áa]rea/i);
      const m = new Map<string, { ubicacion: string; area: string | null; ubi: string | null; subarea: string | null }>();
      for (const r of filas) { const u = r[cU]?.trim(); if (u) m.set(u, { ubicacion: u, area: r[cA]?.trim() || null, ubi: cB ? r[cB]?.trim() || null : null, subarea: cS ? r[cS]?.trim() || null : null }); }
      const xs = [...m.values()];
      for (let i = 0; i < xs.length; i += 2000) {
        setPaso(`Guardando ${fmtNum(Math.min(i + 2000, xs.length))} / ${fmtNum(xs.length)}…`);
        const r = await cargarUbicaciones(xs.slice(i, i + 2000)); if (!r.ok) throw new Error(r.mensaje);
      }
      await terminarUbicaciones(f.name, xs.length);
      setMsg({ ok: true, t: `${fmtNum(xs.length)} ubicaciones con área cargadas ✓` });
    } catch (e) { setMsg({ ok: false, t: (e as Error).message }); } finally { setPaso(null); }
  }
  return (
    <section className="rounded-xl bg-tarjeta p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-semibold">Maestro de ubicaciones (WMS)</h2>
          <p className="text-sm text-suave">Excel o CSV con la ubicación y su área (opcional UBI y subárea). Se usa para asignar el área al shortpick y a la bolsa. Reemplaza las ubicaciones que ya existan.</p></div>
        <label className="flex h-11 cursor-pointer items-center gap-2 rounded-lg bg-marca px-4 text-sm font-semibold text-white"><Upload size={16} /> Elegir archivo
          <input type="file" accept={ACEPTA} className="sr-only" disabled={!!paso} onChange={(e) => e.target.files?.[0] && leer(e.target.files[0])} /></label>
      </div>
      {paso && <p className="mt-3 text-sm text-suave">{paso}</p>}
      {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-green-700" : "text-marca-oscuro"}`}>{msg.t}</p>}
    </section>
  );
}
