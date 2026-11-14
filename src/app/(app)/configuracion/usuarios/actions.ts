"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Rol } from "@/lib/roles";

export type Resultado = { ok: boolean; mensaje: string };
const limpiar = (m: string) => m.replace(/^.*?: /, "");

export async function crearUsuario(_: Resultado | null, form: FormData): Promise<Resultado> {
  const supabase = await createClient();
  const g = (k: string) => String(form.get(k) ?? "").trim();
  if (!g("nombre")) return { ok: false, mensaje: "El nombre es obligatorio." };
  const { error } = await supabase.rpc("admin_crear_usuario", {
    p_usuario: g("usuario"), p_password: String(form.get("password") ?? ""), p_nombre: g("nombre"),
    p_dni: g("dni"), p_puesto: g("puesto"), p_rol: g("rol") || "lectura",
  });
  if (error) return { ok: false, mensaje: limpiar(error.message) };
  revalidatePath("/configuracion/usuarios");
  return { ok: true, mensaje: `Usuario ${g("usuario").toLowerCase()} creado.` };
}

export async function cambiarRol(id: string, rol: Rol) {
  const { error } = await (await createClient()).rpc("admin_cambiar_rol", { p_id: id, p_rol: rol });
  if (error) throw new Error(limpiar(error.message));
  revalidatePath("/configuracion/usuarios");
}

export async function cambiarAcceso(id: string, activo: boolean) {
  const { error } = await (await createClient()).rpc("admin_cambiar_acceso", { p_id: id, p_activo: activo });
  if (error) throw new Error(limpiar(error.message));
  revalidatePath("/configuracion/usuarios");
}

export async function nuevaClave(id: string, password: string): Promise<Resultado> {
  const { error } = await (await createClient()).rpc("admin_cambiar_clave", { p_id: id, p_password: password });
  return error ? { ok: false, mensaje: limpiar(error.message) } : { ok: true, mensaje: "Contraseña actualizada." };
}
