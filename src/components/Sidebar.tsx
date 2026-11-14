"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTema } from "@/components/Tema";
import { ChevronDown, ChevronRight, LogOut, Menu, Moon, Settings, Sun, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const INVENTARIO = [
  { href: "/inventario/bolsa", label: "Bolsa de inventario" },
  { href: "/inventario/cruces", label: "Posibles cruces de bolsa" },
  { href: "/inventario/vas", label: "VAS" },
  { href: "/inventario/merma", label: "Merma" },
  { href: "/inventario/5s", label: "Auditoría 5S" },
  { href: "/inventario/incidencias", label: "Incidencias" },
  { href: "/inventario/eru", label: "ERU / ERI" },
];
const OPERACIONES = [
  { href: "/operaciones/recepcion", label: "Auditoría de recepción" },
  { href: "/operaciones/almacen", label: "Auditoría de almacén" },
  { href: "/operaciones/reabasto", label: "Auditoría de reabasto" },
  { href: "/operaciones/picking", label: "Auditoría de picking" },
  { href: "/operaciones/despacho", label: "Auditoría de despacho" },
];
const BUSQUEDA = [
  { href: "/busqueda/perdidos", label: "Perdidos" },
  { href: "/busqueda/sin-ubicacion", label: "Sin ubicación" },
  { href: "/busqueda/shortpick", label: "Shortpick" },
];
const OTROS = [
  { href: "/cargas", label: "Cargas" },
];

export function Sidebar({ nombre, rol, esAdmin }: { nombre: string; rol: string; esAdmin: boolean }) {
  const path = usePathname();
  const [abierto, setAbierto] = useState(true);
  const [abiertoOps, setAbiertoOps] = useState(true);
  const [abiertoBus, setAbiertoBus] = useState(true);
  const [movil, setMovil] = useState(false);
  const activo = (h: string) => path === h || path.startsWith(h + "/");
  const enlace = (h: string, sub = false) =>
    `block rounded-lg px-3 ${sub ? "py-2.5" : "py-3"} text-sm ${
      activo(h) ? "bg-marca text-white font-semibold" : "text-neutral-200 hover:bg-white/10"
    }`;

  const { oscuro, cambiar: cambiarTema } = useTema();

  async function salir() {
    await createClient().auth.signOut();
    window.location.href = "/login";
  }

  return (
    <aside className="bg-grafito text-white md:w-64 md:min-h-screen md:shrink-0">
      <div className="flex items-center justify-between px-4 py-4 md:py-6">
        <Link href="/" aria-label="Inicio">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo_blanco.svg" alt="OpsPulse" className="h-10 w-auto" />
        </Link>
        <button className="md:hidden p-2" aria-label={movil ? "Cerrar menú" : "Abrir menú"} onClick={() => setMovil(!movil)}>
          {movil ? <X /> : <Menu />}
        </button>
      </div>
      <nav aria-label="Menú principal" className={`${movil ? "flex" : "hidden"} md:flex flex-col gap-1 px-3 pb-6`}>
        <button onClick={() => setAbierto(!abierto)} aria-expanded={abierto}
          className="flex items-center justify-between rounded-lg bg-white/10 px-3 py-3 text-sm font-semibold">
          Control de inventario {abierto ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        {abierto && (
          <div className="ml-3 flex flex-col gap-0.5 border-l border-white/20 pl-3">
            {INVENTARIO.map((i) => (
              <Link key={i.href} href={i.href} className={enlace(i.href, true)} onClick={() => setMovil(false)}>{i.label}</Link>
            ))}
          </div>
        )}
        <button onClick={() => setAbiertoOps(!abiertoOps)} aria-expanded={abiertoOps}
          className="mt-2 flex items-center justify-between rounded-lg bg-white/10 px-3 py-3 text-sm font-semibold">
          Seguimiento de operaciones {abiertoOps ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        {abiertoOps && (
          <div className="ml-3 flex flex-col gap-0.5 border-l border-white/20 pl-3">
            {OPERACIONES.map((i) => (
              <Link key={i.href} href={i.href} className={enlace(i.href, true)} onClick={() => setMovil(false)}>{i.label}</Link>
            ))}
          </div>
        )}
        <button onClick={() => setAbiertoBus(!abiertoBus)} aria-expanded={abiertoBus}
          className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-white/10 px-3 py-3 text-left text-sm font-semibold">
          Control de búsqueda de incidencias {abiertoBus ? <ChevronDown size={16} className="shrink-0" /> : <ChevronRight size={16} className="shrink-0" />}
        </button>
        {abiertoBus && (
          <div className="ml-3 flex flex-col gap-0.5 border-l border-white/20 pl-3">
            {BUSQUEDA.map((i) => (
              <Link key={i.href} href={i.href} className={enlace(i.href, true)} onClick={() => setMovil(false)}>{i.label}</Link>
            ))}
          </div>
        )}
        <div className="mt-2 flex flex-col gap-0.5">
          {OTROS.map((i) => (
            <Link key={i.href} href={i.href} className={enlace(i.href)} onClick={() => setMovil(false)}>{i.label}</Link>
          ))}
        </div>
        <div className="mt-6 rounded-xl bg-white/5 p-3 text-sm">
          <div className="flex items-center gap-3 px-1 pb-3">
            <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-marca font-bold">
              {nombre.trim().charAt(0).toUpperCase() || "?"}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{nombre}</p>
              <p className="text-xs text-neutral-300">{rol}</p>
            </div>
          </div>
          <div className="flex flex-col gap-0.5 border-t border-white/15 pt-2">
            <button onClick={cambiarTema} className="flex items-center gap-2 rounded-lg px-2 py-2.5 text-neutral-200 hover:bg-white/10">
              {oscuro ? <Sun size={16} /> : <Moon size={16} />} {oscuro ? "Tema claro" : "Tema oscuro"}
            </button>
            {esAdmin && (
              <Link href="/configuracion" onClick={() => setMovil(false)}
                className={`flex items-center gap-2 rounded-lg px-2 py-2.5 ${activo("/configuracion") ? "bg-marca text-white" : "text-neutral-200 hover:bg-white/10"}`}>
                <Settings size={16} /> Configurar
              </Link>
            )}
            <button onClick={salir} className="flex items-center gap-2 rounded-lg px-2 py-2.5 text-neutral-200 hover:bg-white/10">
              <LogOut size={16} /> Cerrar sesión
            </button>
          </div>
        </div>
      </nav>
    </aside>
  );
}
