"use client";

import { useState } from "react";
import { Check, ChevronDown, Copy } from "lucide-react";

/** Cuadro plegable con valores unidos por comas (sin espacios) y botón Copiar. */
export function CopiarLista({ titulo, valores }: { titulo: string; valores: string[] }) {
  const unicos = [...new Set(valores.filter(Boolean))];
  const texto = unicos.join(",");
  const [abierto, setAbierto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try { await navigator.clipboard.writeText(texto); }
    catch { const t = document.createElement("textarea"); t.value = texto; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove(); }
    setCopiado(true); setTimeout(() => setCopiado(false), 1500);
  }
  return (
    <section className="rounded-xl bg-tarjeta">
      <div className="flex items-center gap-2 p-3">
        <button onClick={() => setAbierto(!abierto)} aria-expanded={abierto} className="flex flex-1 items-center gap-2 text-left text-sm font-semibold">
          <ChevronDown size={16} className={`transition ${abierto ? "" : "-rotate-90"}`} /> {titulo} <span className="font-normal text-suave">({unicos.length})</span>
        </button>
        <button onClick={copiar} disabled={!unicos.length} className="flex h-9 items-center gap-1.5 rounded-lg bg-marca px-3 text-sm font-semibold text-white disabled:opacity-40">
          {copiado ? <Check size={16} /> : <Copy size={16} />} {copiado ? "Copiado" : "Copiar"}
        </button>
      </div>
      {abierto && (
        <textarea readOnly value={texto} rows={4} onFocus={(e) => e.currentTarget.select()} aria-label={titulo}
          className="mx-3 mb-3 w-[calc(100%-1.5rem)] resize-y break-all rounded-lg border border-borde bg-fondo p-2 font-mono text-xs" />
      )}
    </section>
  );
}
