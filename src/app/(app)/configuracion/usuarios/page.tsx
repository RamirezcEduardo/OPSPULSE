import Link from "next/link";
import { exigirAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fmtFecha } from "@/lib/formato";
import { CrearUsuario, FilaUsuario } from "./ui";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const yo = await exigirAdmin();
  const supabase = await createClient();
  const { data, error: e } = await supabase.rpc("admin_listar_usuarios");
  const error = e?.message ?? null;
  const filas = ((data ?? []) as { id: string; usuario: string; nombre: string | null; dni: string | null; puesto: string | null; rol: string; activo: boolean; ultimo_ingreso: string | null }[])
    .map((u) => ({ id: u.id, usuario: u.usuario, nombre: u.nombre ?? "", dni: u.dni ?? "", puesto: u.puesto ?? "", rol: u.rol, activo: u.activo, ultimo: u.ultimo_ingreso ? fmtFecha(u.ultimo_ingreso) : "Nunca" }));

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
                  <tr>{["Nombre", "Usuario", "DNI", "Puesto", "Rol", "Último ingreso", "Acceso", ""].map((h) => (
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
