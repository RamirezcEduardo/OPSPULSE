"use client";

import { useState } from "react";
import { Camera, ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Botones Cámara / Galería que suben al bucket "fotos" y devuelven las rutas. */
export function Fotos({ carpeta, fotos, setFotos }: { carpeta: string; fotos: string[]; setFotos: (f: string[]) => void }) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function subir(files: File[]) {
    setSubiendo(true); setError(null);
    const nuevas: string[] = [];
    for (const f of files) {
      const ruta = `${carpeta}/${new Date().toISOString().slice(0, 10)}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${f.name.split(".").pop() || "jpg"}`;
      const { error } = await createClient().storage.from("fotos").upload(ruta, f, { contentType: f.type });
      if (error) setError(error.message); else nuevas.push(ruta);
    }
    setFotos([...fotos, ...nuevas]); setSubiendo(false);
  }
  const cls = "flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-borde font-semibold";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-2 gap-2">
        <label className={cls}><Camera size={20} /> {subiendo ? "Subiendo…" : "Cámara"}
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => e.target.files?.length && subir(Array.from(e.target.files))} /></label>
        <label className={cls}><ImageIcon size={20} /> {subiendo ? "Subiendo…" : "Galería"}
          <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { if (e.target.files?.length) subir(Array.from(e.target.files)); e.target.value = ""; }} /></label>
      </div>
      {fotos.length > 0 && <p className="text-xs text-suave">📷 {fotos.length} foto(s) adjunta(s)</p>}
      {error && <p className="text-xs text-marca-oscuro">{error}</p>}
    </div>
  );
}
