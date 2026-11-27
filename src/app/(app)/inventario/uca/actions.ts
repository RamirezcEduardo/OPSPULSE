"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function ucaPosiciones(filas: Record<string, unknown>[]) {
  const s = await createClient();
  const { error } = await s.from("uca_posicion").upsert(filas, { onConflict: "ubicacion" });
  return error ? { ok: false, mensaje: error.message } : { ok: true, mensaje: "" };
}
export async function ucaLimpiarStock() {
  const s = await createClient();
  const { error } = await s.from("uca_stock").delete().neq("ubicacion", "");
  return error ? { ok: false, mensaje: error.message } : { ok: true, mensaje: "" };
}
export async function ucaStock(filas: Record<string, unknown>[]) {
  const s = await createClient();
  const { error } = await s.from("uca_stock").upsert(filas, { onConflict: "ubicacion" });
  return error ? { ok: false, mensaje: error.message } : { ok: true, mensaje: "" };
}
export async function ucaCerrar(corte: string | null, archivo: string, n: number) {
  const s = await createClient();
  const { data: cl } = await s.auth.getClaims();
  if (corte) await s.rpc("uca_cerrar_corte", { p_corte: corte.slice(0, 10) });
  await s.from("carga").insert({ fuente: "CONTEO", archivo: `UCA · ${archivo}`, filas: n, insertadas: n, cargado_por: cl?.claims?.sub });
  revalidatePath("/inventario/uca");
}
