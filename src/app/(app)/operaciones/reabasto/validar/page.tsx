import { createClient } from "@/lib/supabase/server";
import { Ruta } from "./Ruta";

export const dynamic = "force-dynamic";

export default async function Validar({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const { dia: dp } = await searchParams;
  const supabase = await createClient();
  const { data: ds } = await supabase.from("v_validacion_reabasto").select("dia").order("dia", { ascending: false }).limit(3000);
  const dias = [...new Set((ds ?? []).map((d) => d.dia as string))];
  const dia = dp && dias.includes(dp) ? dp : dias[0];
  const { data } = dia
    ? await supabase.from("v_validacion_reabasto")
        .select("clave,motivo_seleccion,validacion,cod_alternat,descripcion,cantidad,lote,nro_lpn,ubic_destino,area,usuario_tarea,tipo_asignac,estado_tarea,producto_en_ubic,cantidad_completa,cant_encontrada,usuario_responsable,comentario,fotos")
        .eq("dia", dia).order("ubic_destino")
    : { data: [] };
  const { data: us } = await supabase.from("tarea_reabasto").select("usuario").not("usuario", "is", null).limit(5000);
  const usuarios = [...new Set((us ?? []).map((u) => u.usuario as string))].sort();
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <h1 className="text-xl font-extrabold">Validación de reabasto</h1>
      {!data?.length ? <p className="rounded-xl bg-tarjeta p-6 text-sm text-suave">No hay tareas en la muestra para validar.</p>
        : <Ruta tareas={data} usuarios={usuarios} />}
    </div>
  );
}
