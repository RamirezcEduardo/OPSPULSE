"use client";

import { useState, useTransition } from "react";
import { Download, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { ACEPTA, leerArchivo } from "@/lib/parsers/archivo";
import { agregarNoConsiderar, quitarNoConsiderar } from "../actions";

export function plantilla(cols: string[], nombre: string) {
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([cols]), "Hoja1"); XLSX.writeFile(wb, `${nombre}.xlsx`);
}
const campo = "h-11 w-full rounded-lg border border-borde bg-tarjeta px-3 text-sm";
export function FormNoConsiderar({ motivos }: { motivos: string[] }) {
  const [f, setF] = useState({ nro_grupo: "", cod_alternat: "", motivo: "", comentario: "" });
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [p, start] = useTransition();
  const enviar = (filas: Parameters<typeof agregarNoConsiderar>[0]) => start(async () => { const r = await agregarNoConsiderar(filas); setMsg({ ok: r.ok, t: r.mensaje }); if (r.ok) setF({ nro_grupo: "", cod_alternat: "", motivo: f.motivo, comentario: "" }); });
  async function archivo(file: File) {
    const rows = await leerArchivo(file);
    const k = (r: Record<string, string>, ...n: RegExp[]) => r[Object.keys(r).find((x) => n.some((m) => m.test(x))) ?? ""] ?? "";
    enviar(rows.map((r) => ({ nro_grupo: k(r, /grupo/i), cod_alternat: k(r, /alternat/i) || null, motivo: k(r, /^motivo auditor/i, /^motivo$/i), comentario: k(r, /coment/i) || null })));
  }
  return (
    <section className="flex flex-col gap-3 rounded-xl bg-tarjeta p-5">
      <h2 className="font-semibold">Marcar como NO CONSIDERAR</h2>
      <p className="text-xs text-suave">Si dejas el Cod Alternat vacío, se excluye todo el Nro Grupo. Los movimientos marcados salen de la bolsa (Gestión = NO CONSIDERAR).</p>
      <div className="grid gap-2 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs text-suave">Nro Grupo *<input value={f.nro_grupo} onChange={(e) => setF({ ...f, nro_grupo: e.target.value })} inputMode="numeric" className={campo} /></label>
        <label className="flex flex-col gap-1 text-xs text-suave">Cod Alternat (opcional)<input value={f.cod_alternat} onChange={(e) => setF({ ...f, cod_alternat: e.target.value })} inputMode="numeric" className={campo} /></label>
        <label className="flex flex-col gap-1 text-xs text-suave">Motivo auditor *<input list="motivos-nc" value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} className={campo} />
          <datalist id="motivos-nc">{motivos.map((m) => <option key={m} value={m} />)}</datalist></label>
        <label className="flex flex-col gap-1 text-xs text-suave">Comentario<input value={f.comentario} onChange={(e) => setF({ ...f, comentario: e.target.value })} className={campo} /></label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button disabled={p || !f.nro_grupo || !f.motivo} onClick={() => enviar([f])} className="h-11 rounded-lg bg-marca px-5 text-sm font-semibold text-white disabled:opacity-40">{p ? "Guardando…" : "Agregar"}</button>
        <button onClick={() => plantilla(["Nro Grupo", "Cod Alternat (opcional)", "Motivo auditor", "Comentario", "Fecha registro"], "PLANTILLA NO CONSIDERAR")} className="flex h-11 items-center gap-2 rounded-lg border border-borde px-4 text-sm"><Download size={15} /> Plantilla</button>
        <label className="flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-borde px-4 text-sm"><Upload size={15} /> Subir lista (Excel/CSV)
          <input type="file" accept={ACEPTA} className="sr-only" onChange={(e) => e.target.files?.[0] && archivo(e.target.files[0])} /></label>
      </div>
      <p className="text-xs text-suave">Usa la misma plantilla de tu hoja NO CONSIDERAR: Nro Grupo · Cod Alternat (opcional) · Motivo auditor · Comentario · Fecha registro.</p>
      {msg && <p className={`text-sm ${msg.ok ? "text-green-700" : "text-marca"}`}>{msg.t}</p>}
    </section>
  );
}
export function Quitar({ id }: { id: number }) {
  const [p, start] = useTransition();
  return <button disabled={p} onClick={() => confirm("¿Quitar esta exclusión? El movimiento vuelve a contar en la bolsa.") && start(async () => { await quitarNoConsiderar(id); })} className="rounded-lg border border-borde px-2 py-1 text-xs text-marca">{p ? "…" : "Quitar"}</button>;
}
