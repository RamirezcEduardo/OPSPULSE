"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FilaBulto } from "@/lib/parsers/busqueda";

type Clas = "perdidos" | "sin_ubicacion";
const ruta = (c: Clas) => (c === "perdidos" ? "/busqueda/perdidos" : "/busqueda/sin-ubicacion");

export async function cargarBultos(_clas: Clas, archivo: string, filas: FilaBulto[]) {
  const supabase = await createClient();
  const validas = [...new Map(filas.filter((f) => f.nro_lpn).map((f) => [`${f.nro_lpn}|${f.cod_alternat}`, f])).values()];
  if (!validas.length) return { ok: false, mensaje: "El archivo no tiene bultos (falta Nro LPN)." };
  const clases = [...new Set(validas.map((v) => v.clasificacion))] as Clas[];
  const { data: c, error: e1 } = await supabase.from("carga").insert({ fuente: "PERDIDOS", archivo, filas: filas.length, insertadas: validas.length }).select("id").single();
  if (e1) return { ok: false, mensaje: e1.message.includes("row-level") ? "Solo un administrador puede cargar." : e1.message };
  // Los pendientes de esas secciones que no vengan en este archivo quedan "YA NO FIGURA"
  for (const cl of clases) await supabase.from("bulto").update({ visto_ultima_carga: false }).eq("clasificacion", cl).in("estado", ["pendiente", "parcial"]);
  for (let i = 0; i < validas.length; i += 500) {
    const lote = validas.slice(i, i + 500).map((f) => ({ ...f, carga_id: c.id, visto_ultima_carga: true }));
    const { error } = await supabase.from("bulto").upsert(lote, { onConflict: "nro_lpn,cod_alternat" });
    if (error) return { ok: false, mensaje: error.message };
  }
  const { count } = await supabase.from("bulto").select("id", { count: "exact", head: true }).eq("visto_ultima_carga", false).in("estado", ["pendiente", "parcial"]);
  clases.forEach((cl) => revalidatePath(ruta(cl)));
  const n = (cl: Clas) => validas.filter((v) => v.clasificacion === cl).length;
  return { ok: true, mensaje: `${n("perdidos")} a Perdidos · ${n("sin_ubicacion")} a Sin ubicación · ${count ?? 0} pendientes ya no figuran.` };
}

export async function registrarRecuperacion(clas: Clas, r: { bulto_id: number; unidades: number; valor: number; area_encontrado: string | null; ubicacion_encontrado: string | null; dni_recupero: string | null; fotos: string[]; comentario: string | null }) {
  const supabase = await createClient();
  if (!(r.unidades > 0)) return { ok: false, mensaje: "Indica las unidades recuperadas." };
  const { error } = await supabase.from("bulto_recuperacion").insert({ ...r, fotos: r.fotos.length ? r.fotos : null });
  if (error) return { ok: false, mensaje: error.message.includes("row-level") ? "Tu rol no puede registrar recuperaciones." : error.message };
  revalidatePath(ruta(clas));
  return { ok: true, mensaje: "Recuperación registrada." };
}
