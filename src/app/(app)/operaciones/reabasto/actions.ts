"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { seleccionarMuestra, type FilaReabasto, type ParamMuestra } from "@/lib/parsers/reabasto";

export async function cargarReabasto(archivo: string, filas: FilaReabasto[]) {
  const supabase = await createClient();
  const validas = [...new Map(filas.filter((f) => f.nro_tarea && f.fecha).map((f) => [f.clave, f])).values()];
  if (!validas.length) return { ok: false, mensaje: "El archivo no tiene tareas válidas." };

  const { data: carga, error: e1 } = await supabase.from("carga")
    .insert({ fuente: "REABASTO", archivo, filas: filas.length, insertadas: validas.length, duplicadas: filas.length - validas.length, rechazadas: 0 })
    .select("id").single();
  if (e1) return { ok: false, mensaje: e1.message.includes("row-level") ? "Solo un administrador puede cargar archivos." : e1.message };

  const ahora = new Date().toISOString();
  for (let i = 0; i < validas.length; i += 500) {
    const lote = validas.slice(i, i + 500).map((f) => ({ ...f, carga_id: carga.id, ultima_carga_id: carga.id, visto_ultima_carga: true, actualizado_en: ahora }));
    const { error } = await supabase.from("tarea_reabasto").upsert(lote, { onConflict: "clave" });
    if (error) { await supabase.from("carga").delete().eq("id", carga.id); return { ok: false, mensaje: error.message }; }
  }

  // Muestra de auditoría (solo tareas cerradas que aún no estén en la muestra)
  const { data: par } = await supabase.from("parametro").select("valor").eq("clave", "muestra_reabasto").maybeSingle();
  const p = (par?.valor ?? { aleatorias: 25, consol_max: 5, max_por_usuario: 3, incluir_canceladas: true }) as ParamMuestra;
  const { data: ya } = await supabase.from("auditoria_reabasto").select("clave").in("clave", validas.map((v) => v.clave));
  const yaSet = new Set((ya ?? []).map((x) => x.clave));
  const muestra = seleccionarMuestra(validas.filter((v) => !yaSet.has(v.clave)), p);
  if (muestra.size) {
    const { error } = await supabase.from("auditoria_reabasto")
      .insert([...muestra].map(([clave, motivo_seleccion]) => ({ clave, motivo_seleccion })));
    if (error) return { ok: false, mensaje: `Tareas cargadas, pero falló la muestra: ${error.message}` };
  }
  revalidatePath("/operaciones/reabasto");
  return { ok: true, mensaje: `${validas.length} tareas cargadas · ${muestra.size} nuevas en la muestra de auditoría.` };
}

