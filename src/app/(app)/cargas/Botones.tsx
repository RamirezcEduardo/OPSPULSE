"use client";

import { useState, useTransition } from "react";
import { Download, RotateCcw, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
import { eliminarCarga, filasDeApartado, filasDeCarga, restablecer } from "./actions";
import type { Gestion } from "./fuentes";

function bajar(filas: unknown[], nombre: string) {
  const plano = (filas as Record<string, unknown>[]).map((f) => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v && typeof v === "object" ? JSON.stringify(v) : v])));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(plano), "Datos");
  XLSX.writeFile(wb, `${nombre}.xlsx`);
}
const btn = "flex h-9 items-center gap-1.5 rounded-lg border border-borde px-3 text-xs font-semibold disabled:opacity-40";

export function DescargarCarga({ id, fuente, nombre }: { id: string; fuente: string; nombre: string }) {
  const [p, start] = useTransition();
  return <button disabled={p} className={btn} onClick={() => start(async () => { const f = await filasDeCarga(id, fuente); if (!f.length) return alert("Esta carga no tiene filas guardadas."); bajar(f, nombre); })}>
    <Download size={14} />{p ? "…" : "Excel"}</button>;
}
export function DescargarApartado({ id, nombre }: { id: string; nombre: string }) {
  const [p, start] = useTransition();
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  return <button disabled={p} className={`${btn} h-11 bg-tarjeta text-sm`} onClick={() => start(async () => { const f = await filasDeApartado(id); if (!f.length) return alert("Sin datos."); bajar(f, `${nombre} ${hoy}`); })}>
    <Download size={16} />{p ? "Preparando…" : nombre}</button>;
}
export function EliminarCarga({ id, fuente, archivo }: { id: string; fuente: string; archivo: string }) {
  const [p, start] = useTransition();
  return <button disabled={p} className={`${btn} text-red-700`} onClick={() => {
    if (!confirm(`¿Eliminar la carga «${archivo}» y TODAS sus filas (incluidas las gestiones hechas sobre ellas)? No se puede deshacer.`)) return;
    start(async () => { const r = await eliminarCarga(id, fuente); alert(r.mensaje); });
  }}><Trash2 size={14} />Eliminar</button>;
}
export function Restablecer({ tipo, id, eliminar }: { tipo: Gestion; id: string; eliminar?: boolean }) {
  const [p, start] = useTransition();
  const [hecho, setHecho] = useState(false);
  if (hecho) return <span className="text-xs text-green-700">✓ Hecho</span>;
  return <button disabled={p} className={`${btn} ${eliminar ? "text-red-700" : ""}`} onClick={() => {
    if (!confirm(eliminar ? "¿Eliminar este registro? No se puede deshacer." : "¿Restablecer? Volverá a quedar PENDIENTE y se borrará lo registrado.")) return;
    start(async () => { const r = await restablecer(tipo, id); if (r.ok) setHecho(true); else alert(r.mensaje); });
  }}>{eliminar ? <Trash2 size={14} /> : <RotateCcw size={14} />}{p ? "…" : eliminar ? "Eliminar" : "Restablecer"}</button>;
}
