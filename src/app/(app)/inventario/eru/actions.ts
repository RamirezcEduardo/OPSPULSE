"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const TABLAS = new Set(["eru_resumen", "eru_producto", "eri_sku", "ajuste"]);

export async function eruIniciar(mes: string, archivo: string, filas: number) {
  const s = await createClient();
  const { data: cl } = await s.auth.getClaims();
  const { error: e0 } = await s.rpc("eru_borrar_mes", { p_mes: mes });
  if (e0) return { ok: false as const, mensaje: e0.message };
  const { data, error } = await s.from("carga").insert({ fuente: "ERU", archivo, filas, cargado_por: cl?.claims?.sub }).select("id").single();
  if (error) return { ok: false as const, mensaje: error.message };
  return { ok: true as const, id: data.id as string };
}

/** Inserta un lote (≤1000 filas) en una de las tablas del ERU. */
export async function eruLote(tabla: string, carga: string, filas: Record<string, unknown>[]) {
  if (!TABLAS.has(tabla)) return { ok: false, mensaje: "Tabla no permitida" };
  const s = await createClient();
  const { error } = await s.from(tabla).insert(filas.map((x) => ({ ...x, carga_id: carga })));
  return error ? { ok: false, mensaje: error.message } : { ok: true, mensaje: "" };
}

export async function eruTerminar(carga: string, insertadas: number) {
  const s = await createClient();
  await s.from("carga").update({ insertadas }).eq("id", carga);
  await s.rpc("refrescar_ubicacion_area");
  revalidatePath("/inventario/eru", "layout");
}
