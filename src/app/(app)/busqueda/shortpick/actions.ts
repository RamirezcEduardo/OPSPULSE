"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FilaShortpick } from "@/lib/parsers/busqueda";

export async function cargarShortpick(archivo: string, filas: FilaShortpick[]) {
  const supabase = await createClient();
  const validas = filas.filter((f) => f.fecha && f.cod_alternat && !f._sci && f.ubicacion && f.un_ajust < 0 && (f.cod_actividad == null || f.cod_actividad === 4 || f.cod_actividad === 17));
  const sci = filas.filter((f) => f._sci).length;
  if (!validas.length) return { ok: false, mensaje: sci ? `Los códigos vienen en notación científica (${sci} filas). Formatea Cod Alternat como texto y vuelve a exportar.` : "No hay líneas de shortpick válidas." };
  const { data: c, error: e1 } = await supabase.from("carga").insert({ fuente: "SHORTPICK", archivo, filas: filas.length, insertadas: validas.length, rechazadas: filas.length - validas.length }).select("id").single();
  if (e1) return { ok: false, mensaje: e1.message.includes("row-level") ? "Solo un administrador puede cargar." : e1.message };
  let nuevas = 0;
  for (let i = 0; i < validas.length; i += 500) {
    const lote = validas.slice(i, i + 500).map(({ _sci, ...f }) => ({ ...f, carga_id: c.id }));
    const { data, error } = await supabase.from("shortpick_linea")
      .upsert(lote, { onConflict: "fecha,nro_grupo,cod_alternat,ubicacion,un_ajust", ignoreDuplicates: true }).select("id");
    if (error) { await supabase.from("carga").delete().eq("id", c.id); return { ok: false, mensaje: error.message }; }
    nuevas += data?.length ?? 0;
  }
  await supabase.from("carga").update({ insertadas: nuevas, duplicadas: validas.length - nuevas }).eq("id", c.id);
  revalidatePath("/busqueda/shortpick");
  return { ok: true, mensaje: `${nuevas} líneas nuevas · ${validas.length - nuevas} ya existían${sci ? ` · ${sci} rechazadas por notación científica` : ""}.` };
}

export async function verificarShortpick(v: { linea_id: number; estado: string; cantidad_encontrada: number; ubicacion_encontrada: string | null; fotos: string[]; comentario: string | null }) {
  const supabase = await createClient();
  const { error } = await supabase.from("shortpick_verificacion").upsert({ ...v, verificado_en: new Date().toISOString() }, { onConflict: "linea_id" });
  if (error) return { ok: false, mensaje: error.message.includes("row-level") ? "Tu rol no puede registrar búsquedas." : error.message };
  revalidatePath("/busqueda/shortpick");
  return { ok: true, mensaje: "Guardado" };
}
