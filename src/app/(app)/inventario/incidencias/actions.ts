"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function buscarProducto(cod: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("producto").select("descripcion").eq("cod_alternat", cod.trim()).maybeSingle();
  return data?.descripcion ?? null;
}

export type NuevaIncidencia = {
  fecha: string; turno: string | null; tipo: string; proceso: string; cod_alternat: string | null; descripcion: string | null;
  ubic_asignada: string | null; unidad: string | null; cantidad: number | null; lpn: string | null;
  ubicado: boolean | null; ubic_encontrada: string | null; devuelto: boolean | null; comentarios: string | null; fotos: string[];
};

export async function registrarIncidencia(i: NuevaIncidencia) {
  const supabase = await createClient();
  const { data: cl } = await supabase.auth.getClaims();
  const { data: p } = await supabase.from("perfil").select("dni,nombre").eq("id", cl?.claims?.sub ?? "").maybeSingle();
  if (!i.tipo || !i.proceso) return { ok: false, mensaje: "Elige el tipo de incidencia y el proceso." };
  const { error } = await supabase.from("incidencia").insert({ ...i, dni: p?.dni ?? null, nombre: p?.nombre ?? null, fotos: i.fotos.length ? i.fotos : null });
  if (error) return { ok: false, mensaje: error.message.includes("row-level") ? "Tu rol no puede registrar incidencias." : error.message };
  revalidatePath("/inventario/incidencias");
  return { ok: true, mensaje: "Incidencia registrada ✓" };
}
