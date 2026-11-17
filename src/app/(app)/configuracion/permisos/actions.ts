"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Nivel } from "@/lib/modulos";

/** Guarda un nivel; "heredar" borra la regla (vuelve al rol o al valor por defecto). */
export async function guardarPermiso(sujeto_tipo: "rol" | "usuario", sujeto: string, modulo: string, nivel: Nivel | "heredar") {
  const supabase = await createClient();
  const q = nivel === "heredar"
    ? supabase.from("permiso_modulo").delete().match({ sujeto_tipo, sujeto, modulo })
    : supabase.from("permiso_modulo").upsert({ sujeto_tipo, sujeto, modulo, nivel }, { onConflict: "sujeto_tipo,sujeto,modulo" });
  const { error } = await q;
  if (error) throw new Error(error.message.includes("row-level") ? "Solo un administrador puede cambiar permisos." : error.message);
  revalidatePath("/configuracion/permisos");
  revalidatePath("/", "layout");
}
