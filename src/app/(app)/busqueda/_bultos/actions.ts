"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FilaBulto } from "@/lib/parsers/busqueda";

type Clas = "perdidos" | "sin_ubicacion";
const ruta = (c: Clas) => (c === "perdidos" ? "/busqueda/perdidos" : "/busqueda/sin-ubicacion");

export async function cargarBultos(_clas: Clas, archivo: string, filas: FilaBulto[]) {
  const supabase = await createClient();
  // Un mismo LPN+SKU no se duplica: si aparece como Sin Ubicación y como Por Ubicar/Perdido, gana Sin ubicación
  const unicos = new Map<string, FilaBulto>();
  let repetidos = 0;
  for (const f of filas.filter((x) => x.nro_lpn)) {
    const k = `${f.nro_lpn}|${f.cod_alternat}`;
    const ya = unicos.get(k);
    if (ya) { repetidos++; if (ya.clasificacion === "sin_ubicacion") continue; }
    unicos.set(k, f);
  }
  const validas = [...unicos.values()];
  if (!validas.length) return { ok: false, mensaje: "El archivo no tiene bultos (falta Nro LPN)." };
  const clases = [...new Set(validas.map((v) => v.clasificacion))] as Clas[];
  const { data: c, error: e1 } = await supabase.from("carga").insert({ fuente: "PERDIDOS", archivo, filas: filas.length, insertadas: validas.length }).select("id").single();
  if (e1) return { ok: false, mensaje: e1.message.includes("row-level") ? "Solo un administrador puede cargar." : e1.message };
  // Los pendientes de esas secciones que no vengan en este archivo quedan "YA NO FIGURA"
  for (const cl of clases) await supabase.from("bulto").update({ visto_ultima_carga: false }).eq("clasificacion", cl).in("estado", ["pendiente", "parcial"]);
  for (let i = 0; i < validas.length; i += 500) {
    const trozo = validas.slice(i, i + 500);
    // Conserva lo que ya había (supervisor, responsable, área, valor…) si el archivo nuevo lo trae vacío
    const { data: prev } = await supabase.from("bulto").select("*").in("nro_lpn", trozo.map((f) => f.nro_lpn));
    const previo = new Map((prev ?? []).map((b) => [`${b.nro_lpn}|${b.cod_alternat}`, b]));
    const lote = trozo.map((f) => {
      const p = previo.get(`${f.nro_lpn}|${f.cod_alternat}`) ?? {};
      const fusion = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v ?? (p as Record<string, unknown>)[k] ?? null]));
      // Si ya estaba en Sin ubicación, no lo pasa a Perdidos por venir como "Por Ubicar"
      if ((p as { clasificacion?: string }).clasificacion === "sin_ubicacion") { fusion.clasificacion = "sin_ubicacion"; fusion.proceso = (p as { proceso?: string }).proceso ?? fusion.proceso; }
      return { ...fusion, carga_id: c.id, visto_ultima_carga: true };
    });
    const { error } = await supabase.from("bulto").upsert(lote, { onConflict: "nro_lpn,cod_alternat" });
    if (error) return { ok: false, mensaje: error.message };
  }
  const { count } = await supabase.from("bulto").select("id", { count: "exact", head: true }).eq("visto_ultima_carga", false).in("estado", ["pendiente", "parcial"]);
  clases.forEach((cl) => revalidatePath(ruta(cl)));
  const n = (cl: Clas) => validas.filter((v) => v.clasificacion === cl).length;
  return { ok: true, mensaje: `${n("perdidos")} a Perdidos · ${n("sin_ubicacion")} a Sin ubicación${repetidos ? ` · ${repetidos} LPN repetidos unificados` : ""} · ${count ?? 0} pendientes ya no figuran.` };
}

export async function registrarRecuperacion(clas: Clas, r: { bulto_id: number; unidades: number; valor: number; ubicacion_encontrado: string | null; fotos: string[]; comentario: string | null }) {
  const supabase = await createClient();
  if (!(r.unidades > 0)) return { ok: false, mensaje: "Indica las unidades recuperadas." };
  // Quien recuperó = usuario con sesión (registrado_por) + su DNI del perfil
  const { data: cl } = await supabase.auth.getClaims();
  const { data: perfil } = await supabase.from("perfil").select("dni, usuario").eq("id", cl?.claims?.sub ?? "").maybeSingle();
  const { error } = await supabase.from("bulto_recuperacion").insert({ ...r, dni_recupero: perfil?.dni ?? perfil?.usuario ?? null, fotos: r.fotos.length ? r.fotos : null });
  if (error) return { ok: false, mensaje: error.message.includes("row-level") ? "Tu rol no puede registrar recuperaciones." : error.message };
  revalidatePath(ruta(clas));
  return { ok: true, mensaje: "Recuperación registrada." };
}

export async function asignarResponsables(clas: Clas, id: number, supervisor: string, usuarioCauso: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("bulto_asignar", { p_id: id, p_supervisor: supervisor, p_usuario_causo: usuarioCauso });
  if (error) return { ok: false, mensaje: error.message.replace(/^.*?: /, "") };
  revalidatePath(ruta(clas));
  return { ok: true, mensaje: "Responsables guardados." };
}

export async function vincularGrupos(filas: { nro_lpn: string; nro_grupo: string }[]) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("bultos_vincular_grupo", { p_filas: filas });
  if (error) return { ok: false, mensaje: error.message.replace(/^.*?: /, "") };
  revalidatePath("/busqueda/perdidos"); revalidatePath("/busqueda/sin-ubicacion");
  return { ok: true, mensaje: `${data} bultos vinculados a su Nro de grupo.` };
}

export async function cargarUbicacionesReportadas(filas: { nro_grupo: string; ubicacion: string; fecha: string | null; usuario: string | null }[]) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("bultos_ubicaciones", { p_filas: filas });
  if (error) return { ok: false, mensaje: error.message.replace(/^.*?: /, "") };
  revalidatePath("/busqueda/perdidos"); revalidatePath("/busqueda/sin-ubicacion");
  return { ok: true, mensaje: `${data} bultos con ubicación reportada.` };
}
