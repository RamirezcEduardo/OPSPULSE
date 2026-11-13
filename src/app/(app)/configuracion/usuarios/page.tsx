import Link from "next/link";
import { exigirAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtFecha } from "@/lib/formato";
import { CrearUsuario, FilaUsuario } from "./ui";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const yo = await exigirAdmin();
  let error: string | null = null;
  let filas: { id: string; email: string; nombre: string; dni: string; rol: string; activo: boolean; ultimo: string }[] = [];
  try {
    const admin = createAdminClient();
    const [{ data: lista, error: e1 }, { data: perfiles }] = await Promise.all([
      admin.auth.admin.listUsers({ perPage: 1000 }),
      admin.from("perfil").select("id, nombre, dni, rol"),
    ]);
    if (e1) throw e1;
    const porId = new Map((perfiles ?? []).map((p) => [p.id, p]));
    filas = lista.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      nombre: porId.get(u.id)?.nombre ?? "",
      dni: porId.get(u.id)?.dni ?? "",
      rol: porId.get(u.id)?.rol ?? "lectura",
      activo: !(u as { banned_until?: string }).banned_until || new Date((u as { banned_until?: string }).banned_until!) < new Date(),
      ultimo: u.last_sign_in_at ? fmtFecha(u.last_sign_in_at) : "Nunca",
    })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <Link href="/configuracion" className="text-sm text-suave hover:text-marca">← Configuración</Link>
        <h1 className="text-2xl font-extrabold">Usuarios</h1>
      </header>
      {error ? (
        <p role="alert" className="rounded-xl bg-tarjeta p-5 text-sm text-marca-oscuro">{error}</p>
      ) : (
        <>
          <CrearUsuario />
          <section className="rounded-xl bg-tarjeta p-5">
            <h2 className="mb-3 font-semibold">{filas.length} usuarios</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="text-left text-suave">
                  <tr>{["Nombre", "Correo", "DNI", "Rol", "Último ingreso", "Acceso", ""].map((h) => (
                    <th key={h} className="border-b border-borde px-2 py-2 font-medium">{h}</th>))}</tr>
                </thead>
                <tbody>{filas.map((f) => <FilaUsuario key={f.id} u={f} esYo={f.id === yo.id} />)}</tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
