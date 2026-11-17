import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { ROLES, type Rol } from "@/lib/roles";
import { MODULOS, esRegistro, moduloDe, ORDEN } from "@/lib/modulos";
import { obtenerPermisos } from "@/lib/permisos";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { uid, rol, nombre, nivel } = await obtenerPermisos();
  if (!uid) redirect("/login");
  const path = (await headers()).get("x-pathname") ?? "/";
  const modulo = moduloDe(path);
  const n = nivel(modulo);
  const sinAcceso = modulo && (n === "ninguno" || (esRegistro(path) && ORDEN[n] < ORDEN.registrar));
  const ocultos = MODULOS.filter((m) => nivel(m.href) === "ninguno").map((m) => m.href);

  return (
    <div className="md:flex min-h-screen">
      <Sidebar nombre={nombre} rol={ROLES[rol as Rol] ?? rol} esAdmin={rol === "admin"} ocultos={ocultos} />
      <main className="flex-1 min-w-0 px-4 py-6 md:px-8">
        {sinAcceso ? (
          <div className="rounded-xl bg-tarjeta p-6">
            <h1 className="text-lg font-bold">Sin acceso a esta sección</h1>
            <p className="mt-2 text-sm text-suave">Tu usuario no tiene permiso {n === "ninguno" ? "para ver este módulo" : "para registrar en esta pantalla (solo lectura)"}. Pídele acceso a un administrador.</p>
          </div>
        ) : children}
      </main>
    </div>
  );
}
