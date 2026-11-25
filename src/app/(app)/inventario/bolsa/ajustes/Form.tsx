"use client";

import { useState, useTransition } from "react";
import { Download, Upload } from "lucide-react";
import { ACEPTA, leerArchivo } from "@/lib/parsers/archivo";
import { fechaFlexible } from "@/lib/parsers/csv";
import { plantilla } from "../no-considerar/Form";
import { agregarAjustes, quitarAjuste, type AM } from "../actions";

import { COLS_AM } from "./cols";
const campo = "h-10 w-full rounded-lg border border-borde bg-tarjeta px-2 text-sm";
const num = (v: string) => Number(String(v ?? "").replace(/S\/|\s|,/g, "")) || 0;

export function FormAjustes({ hoy, motivos }: { hoy: string; motivos: string[] }) {
  const vacio = { fecha: hoy, nro_grupo: "AUDITOR", cod_alternat: "", descripcion: "", ubicacion: "", cantidad: 0, monto: 0, tipo: "CONTEO CICLICO", motivo: "", comentario: "" };
  const [f, setF] = useState<AM>(vacio);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [p, start] = useTransition();
  const enviar = (xs: AM[]) => start(async () => { const r = await agregarAjustes(xs); setMsg({ ok: r.ok, t: r.mensaje }); if (r.ok) setF(vacio); });
  async function archivo(file: File) {
    const rows = await leerArchivo(file);
    enviar(rows.map((r) => ({ fecha: fechaFlexible(r["Fecha"])?.slice(0, 10) ?? "", nro_grupo: r["Nro Grupo"], cod_alternat: r["Cod Alternat"], descripcion: r["Descripción"] ?? r["Descripcion"], ubicacion: r["Ubicación"] ?? r["Ubicacion"],
      cantidad: num(r["Cantidad"]), monto: num(r["Monto S/"]), tipo: r["TIPO"], motivo: r["MOTIVO OP"], comentario: r["Comentario"] })));
  }
  const c = (k: keyof AM, l: string, t = "text") => <label className="flex flex-col gap-1 text-xs text-suave">{l}<input type={t} list={k === "motivo" ? "motivos-am" : undefined} value={String(f[k] ?? "")} onChange={(e) => setF({ ...f, [k]: t === "number" ? Number(e.target.value) : e.target.value })} className={campo} /></label>;
  return (
    <section className="flex flex-col gap-3 rounded-xl bg-tarjeta p-5">
      <h2 className="font-semibold">Agregar ajuste manual del auditor</h2>
      <p className="text-xs text-suave">Misma plantilla de tu hoja AJUSTES MANUALES. El Monto S/ entra tal cual a la bolsa (positivo = sobrante, negativo = faltante).</p>
      <div className="grid gap-2 sm:grid-cols-5">
        {c("fecha", "Fecha", "date")}{c("nro_grupo", "Nro Grupo")}{c("cod_alternat", "Cod Alternat")}{c("descripcion", "Descripción")}{c("ubicacion", "Ubicación")}
        {c("cantidad", "Cantidad", "number")}{c("monto", "Monto S/", "number")}
        <label className="flex flex-col gap-1 text-xs text-suave">TIPO<select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })} className={campo}><option>CONTEO CICLICO</option><option>AJUSTE LPN</option></select></label>
        {c("motivo", "MOTIVO OP")}{c("comentario", "Comentario")}
        <datalist id="motivos-am">{motivos.map((m) => <option key={m} value={m} />)}</datalist>
      </div>
      <div className="flex flex-wrap gap-2">
        <button disabled={p || !f.motivo || !f.monto} onClick={() => enviar([f])} className="h-11 rounded-lg bg-marca px-5 text-sm font-semibold text-white disabled:opacity-40">{p ? "Guardando…" : "Agregar"}</button>
        <button onClick={() => plantilla(COLS_AM, "PLANTILLA AJUSTES MANUALES")} className="flex h-11 items-center gap-2 rounded-lg border border-borde px-4 text-sm"><Download size={15} /> Plantilla</button>
        <label className="flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-borde px-4 text-sm"><Upload size={15} /> Subir lista (Excel/CSV)
          <input type="file" accept={ACEPTA} className="sr-only" onChange={(e) => e.target.files?.[0] && archivo(e.target.files[0])} /></label>
      </div>
      {msg && <p className={`text-sm ${msg.ok ? "text-green-700" : "text-marca"}`}>{msg.t}</p>}
    </section>
  );
}
export function QuitarAjuste({ id }: { id: number }) {
  const [p, start] = useTransition();
  return <button disabled={p} onClick={() => confirm("¿Eliminar este ajuste manual?") && start(async () => { await quitarAjuste(id); })} className="rounded-lg border border-borde px-2 py-1 text-xs text-marca">{p ? "…" : "Quitar"}</button>;
}
