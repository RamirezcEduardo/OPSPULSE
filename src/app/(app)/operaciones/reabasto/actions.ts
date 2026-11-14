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

const OPC = ["Sí", "No", "N.A."];
export async function guardarAuditoria(_: unknown, form: FormData) {
  const supabase = await createClient();
  const { data: cl } = await supabase.auth.getClaims();
  const uid = cl?.claims?.sub;
  if (!uid) return { ok: false, mensaje: "Sesión vencida." };
  const { data: perfil } = await supabase.from("perfil").select("dni").eq("id", uid).maybeSingle();
  const v = (k: string) => { const x = String(form.get(k) ?? ""); return OPC.includes(x) ? x : null; };
  const clave = String(form.get("clave"));
  const cant = String(form.get("cant_contada") ?? "");
  const { error } = await supabase.from("auditoria_reabasto").upsert({
    clave,
    motivo_seleccion: String(form.get("motivo_seleccion") || "MANUAL"),
    fecha_auditoria: new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" }),
    dni_auditor: perfil?.dni ?? null,
    p1_ubic_correcta: v("p1"), p2_sin_mezcla: v("p2"), p3_cant_cuadra: v("p3"),
    cant_contada: cant === "" ? null : Number(cant),
    p4_lote: v("p4"), p5_fefo: v("p5"), p6_pasillo_limpio: v("p6"),
    hallazgo_principal: String(form.get("hallazgo") || "") || null,
    comentario: String(form.get("comentario") || "") || null,
    auditado_por: uid, auditado_en: new Date().toISOString(),
  }, { onConflict: "clave" });
  if (error) return { ok: false, mensaje: error.message };
  revalidatePath("/operaciones/reabasto");
  return { ok: true, mensaje: "Auditoría guardada." };
}
