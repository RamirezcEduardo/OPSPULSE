"use client";
import { Printer } from "lucide-react";
export function Imprimir() {
  function imprimir() {
    document.querySelectorAll("details").forEach((d) => (d.open = true));
    // Esperar a que carguen todas las fotos antes de imprimir
    const imgs = [...document.images].filter((i) => !i.complete);
    Promise.all(imgs.map((i) => new Promise((r) => { i.onload = i.onerror = r; }))).then(() => window.print());
  }
  return <button onClick={imprimir} className="flex h-10 items-center gap-2 rounded-lg bg-marca px-4 text-sm font-semibold text-white print:hidden"><Printer size={16} /> Imprimir / PDF</button>;
}
