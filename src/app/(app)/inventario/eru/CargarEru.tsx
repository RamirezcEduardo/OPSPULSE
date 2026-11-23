"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ACEPTA, leerArchivo } from "@/lib/parsers/archivo";
import { COLS_ERU, resumirEru, type ResumenEru } from "@/lib/parsers/eru";
import { fmtNum } from "@/lib/formato";

export function CargarEru({ cargados }: { cargados: string[] }) {
  const [prev, setPrev] = useState<{ archivo: string; r: ResumenEru } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [paso, setPaso] = useState<string | null>(null);
  const router = useRouter();

  async function leer(f: File) {
    setMsg(null); setPrev(null); setPaso("Leyendo archivo… (puede tardar un minuto)");
    try {
      const filas = await leerArchivo(f);
      const falta = filas.length ? COLS_ERU.filter((c) => !(c in filas[0])) : COLS_ERU;
      if (falta.length) return setMsg({ ok: false, t: `No es el formato ERU (hoja DATA). Faltan: ${falta.join(", ")}` });
      setPrev({ archivo: f.name, r: resumirEru(filas) });
    } catch (e) { setMsg({ ok: false, t: (e as Error).message }); } finally { setPaso(null); }
  }

  async function cargar() {
    if (!prev) return;
    const { r } = prev;
    const s = createClient();
    try {
      setPaso("Preparando…");
      const { data: u } = await s.auth.getUser();
      const { error: e0 } = await s.rpc("eru_borrar_mes", { p_mes: r.mes });
      if (e0) throw e0;
      const { data: c, error: e1 } = await s.from("carga").insert({ fuente: "ERU", archivo: prev.archivo, filas: r.filas, cargado_por: u.user?.id }).select("id").single();
      if (e1) throw e1;
      const lotes: [string, Record<string, unknown>[]][] = [["eru_resumen", r.resumen], ["eru_producto", r.productos], ["eri_sku", r.eri], ["ajuste", r.ajustes]];
      for (const [t, filas] of lotes) for (let i = 0; i < filas.length; i += 1000) {
        setPaso(`Guardando ${t.replace("_", " ")} ${fmtNum(Math.min(i + 1000, filas.length))} / ${fmtNum(filas.length)}…`);
        const { error } = await s.from(t).insert(filas.slice(i, i + 1000).map((x) => ({ ...x, carga_id: c.id })));
        if (error) throw error;
      }
      await s.from("carga").update({ insertadas: r.resumen.length + r.productos.length + r.eri.length + r.ajustes.length }).eq("id", c.id);
      setMsg({ ok: true, t: `Mes ${r.mes} cargado ✓` }); setPrev(null); router.refresh();
    } catch (e) { setMsg({ ok: false, t: `Error: ${(e as { message?: string }).message ?? e}` }); } finally { setPaso(null); }
  }

  return (
    <section className="rounded-xl bg-tarjeta p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-semibold">Cargar ERU del mes</h2>
          <p className="text-sm text-suave">Archivo «ERU aaaa-mm» descargado como Excel (hoja DATA con UBI, ubic_area y sub_area). Se resume en tu navegador; si el mes ya existe, se reemplaza.</p></div>
        <label className="flex h-11 cursor-pointer items-center gap-2 rounded-lg bg-marca px-4 text-sm font-semibold text-white"><Upload size={16} /> Elegir archivo
          <input type="file" accept={ACEPTA} className="sr-only" disabled={!!paso} onChange={(e) => e.target.files?.[0] && leer(e.target.files[0])} /></label>
      </div>
      {prev && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-borde p-3 text-sm">
          <span className="font-medium">{prev.archivo}</span>
          <span>Mes <b>{prev.r.mes}</b>{cargados.includes(prev.r.mes) && <span className="ml-1 text-amber-700">(ya cargado: se reemplazará)</span>}</span>
          <span>{fmtNum(prev.r.filas)} filas</span>
          <span>{fmtNum(prev.r.resumen.reduce((a, x) => a + x.contadas, 0))} ubicaciones contadas</span>
          <span>{fmtNum(prev.r.eri.length)} SKUs·área (ERI)</span>
          <span>{fmtNum(prev.r.ajustes.length)} movimientos de bolsa</span>
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
