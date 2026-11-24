"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function spIniciar(mes: string, archivo: string, filas: number) {
  const s = await createClient();
  const { data: cl } = await s.auth.getClaims();
  const { error: e0 } = await s.rpc("shortpick_borrar_mes", { p_mes: mes });
  if (e0) return { ok: false as const, mensaje: e0.message };
  const { data, error } = await s.from("carga").insert({ fuente: "SHORTPICK_MES", archivo, filas, cargado_por: cl?.claims?.sub }).select("id").single();
  if (error) return { ok: false as const, mensaje: error.message };
  return { ok: true as const, id: data.id as string };
}
export async function spLote(carga: string, filas: Record<string, unknown>[]) {
  const s = await createClient();
  const { error } = await s.from("shortpick_mov").insert(filas.map((x) => ({ ...x, carga_id: carga })));
  return error ? { ok: false, mensaje: error.message } : { ok: true, mensaje: "" };
}
export async function spTerminar(carga: string, n: number) {
  const s = await createClient();
  await s.from("carga").update({ insertadas: n }).eq("id", carga);
  await s.rpc("refrescar_ubicacion_area"); revalidatePath("/inventario/shortpick"); revalidatePath("/inventario/bolsa");
}
