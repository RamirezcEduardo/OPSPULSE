"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function mermaLote(filas: Record<string, unknown>[], carga: string | null) {
  const s = await createClient();
  const { error } = await s.from("merma").upsert(filas.map((x) => ({ ...x, carga_id: carga })), { onConflict: "lpn,cod_alternat,fecha,linea" });
  return error ? { ok: false, mensaje: error.message.includes("row-level") ? "Tu usuario no puede cargar merma." : error.message } : { ok: true, mensaje: "" };
}
export async function mermaIniciar(archivo: string, filas: number) {
  const s = await createClient();
  const { data: cl } = await s.auth.getClaims();
  const { data } = await s.from("carga").insert({ fuente: "MERMA", archivo, filas, cargado_por: cl?.claims?.sub }).select("id").single();
  return data?.id as string | null;
}
export async function mermaTerminar(carga: string | null, n: number) {
  const s = await createClient();
  if (carga) await s.from("carga").update({ insertadas: n }).eq("id", carga);
  revalidatePath("/inventario/merma", "layout");
}
