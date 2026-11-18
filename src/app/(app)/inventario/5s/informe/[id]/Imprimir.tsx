"use client";
import { Printer } from "lucide-react";
export function Imprimir() {
  return <button onClick={() => window.print()} className="flex h-10 items-center gap-2 rounded-lg bg-marca px-4 text-sm font-semibold text-white print:hidden"><Printer size={16} /> Imprimir / PDF</button>;
}
