"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FilaASN } from "@/lib/parsers/asn";

export type ResultadoCarga = { ok: boolean; mensaje: string };

export async function cargarASN(archivo: string, filas: FilaASN[]): Promise<ResultadoCarga> {
  const supabase = await createClient();
  const { data: c } = await supabase.auth.getClaims();
  if (!c?.claims?.sub) return { ok: false, mensaje: "Sesión vencida." };
  const validas = filas.filter((f) => f.nro_asn && f.estado);
  if (!validas.length) return { ok: false, mensaje: "El archivo no tiene ASN válidas." };

  const { data: existentes } = await supabase.from("asn").select("nro_asn").in("nro_asn", validas.map((f) => f.nro_asn));
  const yaExistian = new Set((existentes ?? []).map((e) => e.nro_asn));

  const { data: carga, error: e1 } = await supabase.from("carga").insert({
    fuente: "ASN", archivo, filas: filas.length,
    insertadas: validas.filter((f) => !yaExistian.has(f.nro_asn)).length,
    duplicadas: yaExistian.size, rechazadas: filas.length - validas.length,
  }).select("id").single();
  if (e1) return { ok: false, mensaje: e1.message.includes("row-level") ? "Solo un administrador puede cargar archivos." : e1.message };

  const ahora = new Date().toISOString();
  for (let i = 0; i < validas.length; i += 500) {
    const lote = validas.slice(i, i + 500).map((f) => ({
      ...f, ultima_carga_id: carga.id, actualizado_en: ahora,
      ...(yaExistian.has(f.nro_asn) ? {} : { primera_carga_id: carga.id }),
    }));
    const { error } = await supabase.from("asn").upsert(lote, { onConflict: "nro_asn" });
    if (error) { await supabase.from("carga").delete().eq("id", carga.id); return { ok: false, mensaje: error.message }; }
    const { error: e2 } = await supabase.from("asn_historial").insert(lote.map((f) => ({
      carga_id: carga.id, nro_asn: f.nro_asn, estado: f.estado, un_recibidas: f.un_recibidas,
      lpn_recibidas: f.lpn_recibidas, pct_recepcion: f.pct_recepcion,
    })));
    if (e2) return { ok: false, mensaje: e2.message };
  }
  revalidatePath("/operaciones/recepcion");
  return { ok: true, mensaje: `${validas.length} ASN cargadas (${validas.length - yaExistian.size} nuevas, ${yaExistian.size} actualizadas).` };
}
