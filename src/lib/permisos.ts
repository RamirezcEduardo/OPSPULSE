import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Nivel } from "./modulos";

/** Nivel efectivo por módulo para el usuario actual (usuario > rol > por defecto). */
export async function obtenerPermisos() {
  const supabase = await createClient();
  const { data: cl } = await supabase.auth.getClaims();
  const uid = cl?.claims?.sub;
  const [{ data: perfil }, { data: perms }] = await Promise.all([
    supabase.from("perfil").select("rol, nombre").eq("id", uid ?? "").maybeSingle(),
    supabase.rpc("mis_permisos"),
  ]);
  const rol = (perfil?.rol ?? "lectura") as string;
  const mapa = new Map(((perms ?? []) as { modulo: string; nivel: Nivel }[]).map((p) => [p.modulo, p.nivel]));
  const nivel = (modulo: string | null): Nivel => (modulo ? mapa.get(modulo) : undefined) ?? (rol === "admin" ? "editar" : "ver");
  return { uid, rol, nombre: perfil?.nombre ?? "", nivel, mapa };
}
