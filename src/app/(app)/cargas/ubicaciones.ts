"use server";

import { createClient } from "@/lib/supabase/server";

export async function cargarUbicaciones(filas: { ubicacion: string; area: string | null; ubi: string | null; subarea: string | null }[]) {
  const s = await createClient();
  const { error } = await s.from("ubicacion_area").upsert(filas.map((x) => ({ ...x, actualizado: new Date().toISOString() })), { onConflict: "ubicacion" });
  return error ? { ok: false, mensaje: error.message } : { ok: true, mensaje: "" };
}
export async function terminarUbicaciones(archivo: string, n: number) {
  const s = await createClient();
  const { data: cl } = await s.auth.getClaims();
  await s.from("carga").insert({ fuente: "UBICACIONES", archivo, filas: n, insertadas: n, cargado_por: cl?.claims?.sub });
}
