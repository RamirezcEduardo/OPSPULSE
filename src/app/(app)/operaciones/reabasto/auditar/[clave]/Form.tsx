"use client";

import { useActionState } from "react";
import { guardarAuditoria } from "../../actions";

const PUNTOS = [
  ["p1", "p1_ubic_correcta", "P1 · Producto en ubicación correcta"],
  ["p2", "p2_sin_mezcla", "P2 · Sin mezcla de SKU"],
  ["p3", "p3_cant_cuadra", "P3 · Cantidad cuadra"],
  ["p4", "p4_lote", "P4 · Lote correcto"],
  ["p5", "p5_fefo", "P5 · Respeta FEFO"],
  ["p6", "p6_pasillo_limpio", "P6 · Pasillo limpio / LPN retirado"],
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function FormAuditoria({ t, hallazgos }: { t: Record<string, any>; hallazgos: string[] }) {
  const [estado, accion, enviando] = useActionState(guardarAuditoria, null);
  return (
    <form action={accion} className="flex flex-col gap-4 rounded-xl bg-tarjeta p-5">
      <input type="hidden" name="clave" value={t.clave} />
      <input type="hidden" name="motivo_seleccion" value={t.motivo_seleccion ?? "MANUAL"} />
      {PUNTOS.map(([n, col, label]) => (
        <fieldset key={n} className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">{label}</legend>
          <div className="grid grid-cols-3 gap-2">
            {["Sí", "No", "N.A."].map((o) => (
              <label key={o} className="cursor-pointer">
                <input type="radio" name={n} value={o} defaultChecked={t[col] === o} className="peer sr-only" />
                <span className="flex h-12 items-center justify-center rounded-lg border border-borde text-sm font-semibold peer-checked:border-marca peer-checked:bg-marca peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-marca">{o}</span>
              </label>))}
          </div>
          {n === "p3" && (
            <label className="flex flex-col gap-1 text-sm">Cantidad contada
              <input name="cant_contada" type="number" inputMode="numeric" defaultValue={t.cant_contada ?? ""} className="h-11 rounded-lg border border-borde bg-tarjeta px-3" />
            </label>)}
        </fieldset>))}
      <label className="flex flex-col gap-1 text-sm">Hallazgo principal
        <select name="hallazgo" defaultValue={t.hallazgo_principal ?? ""} className="h-11 rounded-lg border border-borde bg-tarjeta px-3">
          <option value="">—</option>{hallazgos.map((h) => <option key={h}>{h}</option>)}
        </select></label>
      <label className="flex flex-col gap-1 text-sm">Comentario
        <textarea name="comentario" rows={3} defaultValue={t.comentario_auditoria ?? ""} className="rounded-lg border border-borde bg-tarjeta p-3" /></label>
      <button disabled={enviando} className="h-12 rounded-lg bg-marca font-semibold text-white disabled:opacity-60">{enviando ? "Guardando…" : "Guardar auditoría"}</button>
      {estado && <p role="status" className={`text-sm ${estado.ok ? "text-green-700 dark:text-green-400" : "text-marca-oscuro"}`}>{estado.mensaje}</p>}
    </form>
  );
}
