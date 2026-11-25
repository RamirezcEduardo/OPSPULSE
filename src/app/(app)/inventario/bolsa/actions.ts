"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function guardarTolerancia(obj: Record<string, number>) {
  const s = await createClient();
  const { error } = await s.from("parametro").update({ valor: obj }).eq("clave", "bolsa_obj_md");
  revalidatePath("/inventario/bolsa");
  return error ? { ok: false, mensaje: error.message } : { ok: true, mensaje: "Tolerancias guardadas ✓" };
}

export type NC = { nro_grupo: string; cod_alternat: string | null; motivo: string; comentario: string | null };
export async function agregarNoConsiderar(filas: NC[]) {
  const s = await createClient();
  const limpias = filas.filter((x) => x.nro_grupo?.trim() && x.motivo?.trim()).map((x) => ({ nro_grupo: x.nro_grupo.trim(), cod_alternat: x.cod_alternat?.trim() || null, motivo: x.motivo.trim().toUpperCase(), comentario: x.comentario?.trim() || null }));
  if (!limpias.length) return { ok: false, mensaje: "Falta Nro Grupo o motivo." };
  for (let i = 0; i < limpias.length; i += 1000) {
    const { error } = await s.from("no_considerar").insert(limpias.slice(i, i + 1000));
    if (error) return { ok: false, mensaje: error.message.includes("row-level") ? "Tu usuario no puede editar la bolsa." : error.message };
  }
  revalidatePath("/inventario/bolsa", "layout");
  return { ok: true, mensaje: `${limpias.length} registro(s) marcados como NO CONSIDERAR ✓` };
}
export async function quitarNoConsiderar(id: number) {
  const s = await createClient();
  const { error } = await s.from("no_considerar").delete().eq("id", id);
  revalidatePath("/inventario/bolsa", "layout");
  return error ? { ok: false, mensaje: error.message } : { ok: true, mensaje: "" };
}
