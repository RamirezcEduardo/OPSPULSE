"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { BLOQUES_5S, calcular5S, type Respuesta5S } from "@/lib/reglas/cincoS";

export interface Envio5S {
  fecha: string; area: string; ubicacion: string; turno: string; supervisor: string;
  respuestas: Record<string, Respuesta5S>; hallazgos: string; accion: string; fotos: string[];
}

const VALIDAS = ["Cumple", "Parcial", "No cumple", "N.A."];

export async function guardar5S(e: Envio5S) {
  const supabase = await createClient();
  const { data: cl } = await supabase.auth.getClaims();
  const uid = cl?.claims?.sub;
  if (!uid) return { ok: false, mensaje: "Sesión vencida. Vuelve a iniciar sesión." };
  if (!e.area.trim()) return { ok: false, mensaje: "Indica el área auditada." };
  const ids = BLOQUES_5S.flatMap((b) => b.items.map(([id]) => id));
  const faltan = ids.filter((id) => !VALIDAS.includes(e.respuestas[id]));
  if (faltan.length) return { ok: false, mensaje: `Faltan ${faltan.length} ítems por responder (${faltan.slice(0, 4).join(", ")}${faltan.length > 4 ? "…" : ""}).` };

  const { porS, total, nivel } = calcular5S(e.respuestas);
  const { data: perfil } = await supabase.from("perfil").select("dni, nombre").eq("id", uid).maybeSingle();
  const { error } = await supabase.from("auditoria_5s").insert({
    fecha: e.fecha, area: e.area.trim(), ubicacion: e.ubicacion.trim() || null, turno: e.turno || null,
    supervisor: e.supervisor.trim() || null, dni_auditor: perfil?.dni ?? null, nombre_auditor: perfil?.nombre ?? null,
    respuestas: e.respuestas,
    pct_s1: porS[0], pct_s2: porS[1], pct_s3: porS[2], pct_s4: porS[3], pct_s5: porS[4], pct_total: total, nivel,
    hallazgos: e.hallazgos.trim() || null, accion_correctiva: e.accion.trim() || null, fotos: e.fotos.length ? e.fotos : null,
  });
  if (error) {
    return { ok: false, mensaje: error.message.includes("row-level") ? "Tu usuario no tiene permiso para registrar auditorías 5S (rol auditor, supervisor o admin)." : error.message };
  }
  revalidatePath("/inventario/5s");
  return { ok: true, mensaje: `Auditoría guardada · ${total ?? "—"}% · ${nivel ?? "—"}` };
}
