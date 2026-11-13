import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { ROLES, type Rol } from "@/lib/roles";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: perfil } = await supabase.from("perfil").select("nombre, rol").eq("id", user.id).maybeSingle();
  const rol = (perfil?.rol ?? "lectura") as Rol;

  return (
    <div className="md:flex min-h-screen">
      <Sidebar nombre={perfil?.nombre ?? user.email ?? ""} rol={ROLES[rol]} esAdmin={rol === "admin"} />
      <main className="flex-1 min-w-0 px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
