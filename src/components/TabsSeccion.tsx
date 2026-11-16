"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardCheck } from "lucide-react";

export function TabsSeccion({ base, segunda = "Búsqueda" }: { base: string; segunda?: string }) {
  const p = usePathname();
  const tabs = [
    { href: base, label: "Dashboard y carga", icon: BarChart3, activo: p === base },
    { href: `${base}/buscar`, label: segunda, icon: ClipboardCheck, activo: p.startsWith(`${base}/buscar`) },
  ];
  return (
    <nav aria-label="Secciones" className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-tarjeta p-1 sm:inline-grid sm:w-auto">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={t.activo ? "page" : undefined}
          className={`flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold ${t.activo ? "bg-marca text-white" : "text-suave hover:text-texto"}`}>
          <t.icon size={16} /> {t.label}
        </Link>))}
    </nav>
  );
}
