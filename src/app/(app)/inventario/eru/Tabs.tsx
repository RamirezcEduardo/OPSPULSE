"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const T = [["/inventario/eru", "Resumen"], ["/inventario/eru/eru", "ERU · ubicaciones"], ["/inventario/eru/eri", "ERI · SKU"]];
export function TabsEru() {
  const p = usePathname();
  return (
    <nav aria-label="Vistas ERU / ERI" className="mb-5 grid grid-cols-3 gap-1 rounded-xl bg-tarjeta p-1 sm:inline-grid sm:w-auto">
      {T.map(([h, l]) => <Link key={h} href={h} className={`rounded-lg px-4 py-2.5 text-center text-sm font-semibold ${p === h ? "bg-marca text-white" : "text-suave hover:text-texto"}`}>{l}</Link>)}
    </nav>
  );
}
