"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface Validacion {
  clave: string; producto_en_ubic: boolean; cantidad_completa: boolean;
  cant_encontrada: number | null; usuario_responsable: string | null; comentario: string | null; fotos: string[];
}

export async function guardarValidacion(v: Validacion) {
  const supabase = await createClient();
  const { data: cl } = await supabase.auth.getClaims();
  const uid = cl?.claims?.sub;
  if (!uid) return { ok: false, mensaje: "Sesión vencida." };
  const ok = v.producto_en_ubic && v.cantidad_completa;
  if (!ok && !v.usuario_responsable?.trim()) return { ok: false, mensaje: "Indica el usuario responsable del reabasto." };
  const { data: perfil } = await supabase.from("perfil").select("dni").eq("id", uid).maybeSingle();
  const { error } = await supabase.from("auditoria_reabasto").update({
    producto_en_ubic: v.producto_en_ubic,
    cantidad_completa: v.cantidad_completa,
    cant_encontrada: v.cantidad_completa ? null : v.cant_encontrada,
    usuario_responsable: ok ? null : v.usuario_responsable!.trim(),
    comentario: v.comentario || null,
    fotos: v.fotos.length ? v.fotos : null,
    fecha_auditoria: new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" }),
    dni_auditor: perfil?.dni ?? null,
    auditado_por: uid,
    validado_en: new Date().toISOString(),
    levantado_en: null,
  }).eq("clave", v.clave);
  if (error) return { ok: false, mensaje: error.message };
  revalidatePath("/operaciones/reabasto");
  return { ok: true, mensaje: ok ? "Conforme ✓" : "Guardado como PENDIENTE" };
}

export async function levantarIncidencia(clave: string) {
  const supabase = await createClient();
  const { data: cl } = await supabase.auth.getClaims();
  const { error } = await supabase.from("auditoria_reabasto")
    .update({ levantado_en: new Date().toISOString(), levantado_por: cl?.claims?.sub }).eq("clave", clave);
  if (error) return { ok: false, mensaje: error.message };
  revalidatePath("/operaciones/reabasto");
  return { ok: true, mensaje: "Incidencia levantada." };
}
