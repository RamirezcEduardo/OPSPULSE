import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Verifica sesión y rol admin; si no, redirige al inicio. */
export async function exigirAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: perfil } = await supabase.from("perfil").select("rol").eq("id", user.id).maybeSingle();
  if (perfil?.rol !== "admin") redirect("/");
  return user;
}
