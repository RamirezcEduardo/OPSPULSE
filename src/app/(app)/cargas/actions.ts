"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerPermisos } from "@/lib/permisos";
import { APARTADOS, TABLA_CARGA, type Gestion } from "./fuentes";

async function admin() {
  const { rol } = await obtenerPermisos();
  if (rol !== "admin") throw new Error("Solo un administrador puede hacer esto.");
  return createClient();
}

async function todo(q: (desde: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>) {
  const filas: unknown[] = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await q(d);
    if (error) throw new Error(error.message);
    filas.push(...(data ?? []));
    if (!data || data.length < 1000 || filas.length >= 200000) break;
  }
  return filas;
}

export async function filasDeCarga(id: string, fuente: string) {
  const s = await admin();
  const t = TABLA_CARGA[fuente]?.tabla;
  if (!t) return [];
  return todo((d) => s.from(t).select("*").eq("carga_id", id).range(d, d + 999));
}

export async function filasDeApartado(id: string) {
  const s = await admin();
  const a = APARTADOS.find((x) => x.id === id)!;
  return todo((d) => s.from(a.tabla).select("*").order(a.orden).range(d, d + 999));
}

export async function eliminarCarga(id: string, fuente: string) {
  try {
    const s = await admin();
    const t = TABLA_CARGA[fuente]?.tabla;
    if (t === "bulto") {
      const { data: b } = await s.from("bulto").select("id").eq("carga_id", id);
      const ids = (b ?? []).map((x) => x.id);
      if (ids.length) await s.from("bulto_recuperacion").delete().in("bulto_id", ids);
    }
    if (t === "shortpick_linea") {
      const { data: l } = await s.from("shortpick_linea").select("id").eq("carga_id", id);
      const ids = (l ?? []).map((x) => x.id);
      if (ids.length) await s.from("shortpick_verificacion").delete().in("linea_id", ids);
    }
    if (t) { const { error } = await s.from(t).delete().eq("carga_id", id); if (error) return { ok: false, mensaje: error.message }; }
    const { error } = await s.from("carga").delete().eq("id", id);
    if (error) return { ok: false, mensaje: error.message };
    revalidatePath("/", "layout");
    return { ok: true, mensaje: "Carga eliminada con sus filas." };
  } catch (e) { return { ok: false, mensaje: (e as Error).message }; }
}

export async function restablecer(tipo: Gestion, id: string) {
  try {
    const s = await admin();
    const r =
      tipo === "reabasto" ? await s.from("auditoria_activo").update({ cant_fisica: null, observacion: null, fotos: null, validado_por: null, validado_en: null }).eq("id", id)
      : tipo === "shortpick" ? await s.from("shortpick_verificacion").delete().eq("id", id)
      : tipo === "recuperacion" ? await s.from("bulto_recuperacion").delete().eq("id", id)
      : tipo === "asn" ? await s.from("asn_gestion").delete().eq("nro_asn", id)
      : tipo === "5s" ? await s.from("auditoria_5s").delete().eq("id", id)
      : await s.from("incidencia").delete().eq("id", id);
    if (r.error) return { ok: false, mensaje: r.error.message };
    revalidatePath("/", "layout");
    return { ok: true, mensaje: "Listo ✓" };
  } catch (e) { return { ok: false, mensaje: (e as Error).message }; }
}
