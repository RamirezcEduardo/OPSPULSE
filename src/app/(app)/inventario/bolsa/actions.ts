"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function guardarTolerancia(obj: Record<string, number>) {
  const s = await createClient();
  const { error } = await s.from("parametro").update({ valor: obj }).eq("clave", "bolsa_obj_md");
  revalidatePath("/inventario/bolsa");
  return error ? { ok: false, mensaje: error.message } : { ok: true, mensaje: "Tolerancias guardadas ✓" };
}

export type NC = { nro_grupo: string; cod_alternat: string | null; motivo: string; comentario: string | null; fecha?: string | null };
export async function agregarNoConsiderar(filas: NC[]) {
  const s = await createClient();
  const limpias = filas.filter((x) => x.nro_grupo?.trim() && x.motivo?.trim()).map((x) => ({ nro_grupo: x.nro_grupo.trim(), cod_alternat: x.cod_alternat?.trim() || null, motivo: x.motivo.trim().toUpperCase(), comentario: x.comentario?.trim() || null, registrado_en: x.fecha || null }));
  if (!limpias.length) return { ok: false, mensaje: "Falta Nro Grupo o motivo." };
  // Una sola fila por Nro Grupo + SKU (la última gana); si ya existe, se actualiza el motivo
  const unicas = [...new Map(limpias.map((x) => [`${x.nro_grupo}|${x.cod_alternat ?? ""}`, x])).values()];
  for (let i = 0; i < unicas.length; i += 1000) {
    const { error } = await s.from("no_considerar").upsert(unicas.slice(i, i + 1000), { onConflict: "nro_grupo,cod_alternat" });
    if (error) return { ok: false, mensaje: error.message.includes("row-level") ? "Tu usuario no puede editar la bolsa." : error.message };
  }
  revalidatePath("/inventario/bolsa", "layout");
  return { ok: true, mensaje: `${unicas.length} registro(s) marcados como NO CONSIDERAR ✓${unicas.length < limpias.length ? ` (${limpias.length - unicas.length} repetidos en el archivo se unieron)` : ""}` };
}
export async function quitarNoConsiderar(id: number) {
  const s = await createClient();
  const { error } = await s.from("no_considerar").delete().eq("id", id);
  revalidatePath("/inventario/bolsa", "layout");
  return error ? { ok: false, mensaje: error.message } : { ok: true, mensaje: "" };
}

export type AM = { fecha: string; nro_grupo: string; cod_alternat: string; descripcion: string; ubicacion: string; cantidad: number; monto: number; tipo: string; motivo: string; comentario: string };
export async function agregarAjustes(filas: AM[]) {
  const s = await createClient();
  const xs = filas.filter((x) => x.fecha && x.motivo && x.tipo && Number.isFinite(x.monto)).map((x, i) => ({
    fuente: "MANUAL", nro_grupo: x.nro_grupo || "AUDITOR", nro_lpn: `MANUAL-${Date.now()}-${i}`, cod_alternat: x.cod_alternat || null,
    fecha: `${x.fecha}T12:00:00-05:00`, mes: x.fecha.slice(0, 7), descripcion_archivo: x.descripcion || null, ubicacion: x.ubicacion || null,
    un_ajuste: x.cantidad || 0, monto_manual: x.monto, tipo: x.tipo.toUpperCase(), motivo_op: x.motivo.toUpperCase(), comentario: x.comentario || null }));
  if (!xs.length) return { ok: false, mensaje: "Faltan fecha, TIPO, MOTIVO OP o monto." };
  const { error } = await s.from("ajuste").insert(xs);
  revalidatePath("/inventario/bolsa", "layout");
  return error ? { ok: false, mensaje: error.message.includes("row-level") ? "Tu usuario no puede editar la bolsa." : error.message } : { ok: true, mensaje: `${xs.length} ajuste(s) agregados ✓` };
}
export async function quitarAjuste(id: number) {
  const s = await createClient();
  const { error } = await s.from("ajuste").delete().eq("id", id).eq("fuente", "MANUAL");
  revalidatePath("/inventario/bolsa", "layout");
  return error ? { ok: false, mensaje: error.message } : { ok: true, mensaje: "" };
}
