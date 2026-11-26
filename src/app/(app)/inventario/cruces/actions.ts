"use server";

import { createClient } from "@/lib/supabase/server";

export type Mov = { fecha: string; nro_grupo: string | null; ubicacion: string | null; area: string | null; un: number; valor: number; motivo: string; gestion: string; fuente: string; descripcion: string | null };

export async function consultarContraparte(sku: string, desde: string | null) {
  const s = await createClient();
  const { data, error } = await s.rpc("consulta_contraparte", { p_sku: sku.trim(), p_desde: desde || null });
  if (error) return { ok: false as const, mensaje: error.message, movs: [] as Mov[] };
  return { ok: true as const, mensaje: "", movs: (data ?? []) as Mov[] };
}
