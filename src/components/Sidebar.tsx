"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, ChevronRight, LogOut, Menu, X } from "lucide-react";
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
const OTROS = [
  { href: "/procesos", label: "Procesos pendientes" },
  { href: "/reabasto", label: "Auditoría reabasto" },
  { href: "/cargas", label: "Cargas" },
];

export function Sidebar({ nombre, rol }: { nombre: string; rol: string }) {
  const path = usePathname();
  const [abierto, setAbierto] = useState(true);
  const [movil, setMovil] = useState(false);
  const activo = (h: string) => path === h || path.startsWith(h + "/");
  const enlace = (h: string, sub = false) =>
    `block rounded-lg px-3 ${sub ? "py-2.5" : "py-3"} text-sm ${
      activo(h) ? "bg-marca text-white font-semibold" : "text-neutral-200 hover:bg-white/10"
    }`;

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
        <div className="mt-2 flex flex-col gap-0.5">
          {OTROS.map((i) => (
            <Link key={i.href} href={i.href} className={enlace(i.href)} onClick={() => setMovil(false)}>{i.label}</Link>
          ))}
        </div>
        <div className="mt-6 border-t border-white/15 pt-4 px-3 text-xs text-neutral-300">
          <p className="font-semibold text-white">{nombre}</p>
          <p className="capitalize">{rol}</p>
          <button onClick={salir} className="mt-3 flex items-center gap-2 text-neutral-200 hover:text-white">
            <LogOut size={14} /> Cerrar sesión
          </button>
        </div>
      </nav>
    </aside>
  );
}
