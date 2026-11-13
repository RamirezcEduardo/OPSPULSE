"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Rol } from "@/lib/roles";
import { normalizarUsuario, usuarioAEmail, usuarioValido } from "@/lib/usuario";

const ROLES_VALIDOS: Rol[] = ["admin", "auditor", "supervisor", "lectura"];
export type Resultado = { ok: boolean; mensaje: string };

export async function crearUsuario(_: Resultado | null, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const usuario = normalizarUsuario(String(form.get("usuario") ?? ""));
  const puesto = String(form.get("puesto") ?? "").trim() || null;
  const nombre = String(form.get("nombre") ?? "").trim();
  const dni = String(form.get("dni") ?? "").trim() || null;
  const rol = String(form.get("rol")) as Rol;
  const password = String(form.get("password") ?? "");
  if (!usuarioValido(usuario) || !nombre) return { ok: false, mensaje: "Nombre y usuario (3–40 letras, números, . _ -) son obligatorios." };
  if (!ROLES_VALIDOS.includes(rol)) return { ok: false, mensaje: "Rol no válido." };
  if (password.length < 8) return { ok: false, mensaje: "La contraseña debe tener al menos 8 caracteres." };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: usuarioAEmail(usuario), password, email_confirm: true, user_metadata: { nombre, dni, puesto },
  });
  if (error) return { ok: false, mensaje: error.message.includes("already") ? "Ese usuario ya existe." : error.message };
  const { error: e2 } = await admin.from("perfil").update({ nombre, dni, rol, usuario, puesto }).eq("id", data.user.id);
  if (e2) return { ok: false, mensaje: e2.message };
  revalidatePath("/configuracion/usuarios");
  return { ok: true, mensaje: `Usuario ${usuario} creado como ${rol}.` };
}

export async function cambiarRol(id: string, rol: Rol) {
  const yo = await exigirAdmin();
  if (!ROLES_VALIDOS.includes(rol)) throw new Error("Rol no válido");
  if (id === yo.id && rol !== "admin") throw new Error("No puedes quitarte tu propio rol de admin.");
  const { error } = await createAdminClient().from("perfil").update({ rol }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/configuracion/usuarios");
}

export async function cambiarAcceso(id: string, activo: boolean) {
  const yo = await exigirAdmin();
  if (id === yo.id) throw new Error("No puedes desactivar tu propia cuenta.");
  const { error } = await createAdminClient().auth.admin.updateUserById(id, {
    ban_duration: activo ? "none" : "876000h",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/configuracion/usuarios");
}

export async function nuevaClave(id: string, password: string): Promise<Resultado> {
  await exigirAdmin();
  if (password.length < 8) return { ok: false, mensaje: "Mínimo 8 caracteres." };
  const { error } = await createAdminClient().auth.admin.updateUserById(id, { password });
  return error ? { ok: false, mensaje: error.message } : { ok: true, mensaje: "Contraseña actualizada." };
}
