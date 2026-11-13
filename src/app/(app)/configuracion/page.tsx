import Link from "next/link";
import { exigirAdmin } from "@/lib/auth";

const SECCIONES: { t: string; d: string; href?: string }[] = [
  { t: "Usuarios", href: "/configuracion/usuarios", d: "Crear usuarios, asignar rol (admin, auditor, supervisor, lectura), desactivar acceso y restablecer contraseña." },
  { t: "Permisos por vista", d: "Elegir qué módulos ve cada rol o cada usuario, y si puede solo ver, registrar o editar." },
  { t: "Áreas y supervisores", d: "Limitar a cada supervisor a sus áreas (Knapp, Mezzanine…) y asignar responsables." },
  { t: "Maestros", d: "Áreas, ubicaciones virtuales, motivos, pantallas del cód. 29, auditores y lista de no considerar." },
  { t: "Parámetros", d: "Muestra de reabasto, turnos, ventana de cruces, niveles 5S, tramos de demora y cierres trimestrales." },
  { t: "Metas", d: "Metas de ERU, auditorías y KPIs operativos por área y proceso." },
  { t: "Sitios", d: "Agregar CD06 y plantas para el crecimiento multi-sitio." },
  { t: "Bitácora", d: "Quién cargó, editó, confirmó cruces o pasó a NO CONSIDERAR, y cuándo." },
];

export default async function Configuracion() {
  await exigirAdmin();

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-extrabold">Configuración</h1>
        <p className="text-sm text-suave">Solo visible para administradores</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {SECCIONES.map((s) =>
          s.href ? (
            <Link key={s.t} href={s.href} className="rounded-xl bg-tarjeta p-5 outline-marca hover:outline-2">
              <h2 className="font-semibold">{s.t}</h2>
              <p className="mt-1 text-sm text-suave">{s.d}</p>
              <p className="mt-3 text-xs font-semibold text-marca">Abrir →</p>
            </Link>
          ) : (
            <section key={s.t} className="rounded-xl bg-tarjeta p-5">
              <h2 className="font-semibold">{s.t}</h2>
              <p className="mt-1 text-sm text-suave">{s.d}</p>
              <p className="mt-3 text-xs font-semibold text-suave">Próximamente</p>
            </section>
          ),
        )}
      </div>
    </div>
  );
}
