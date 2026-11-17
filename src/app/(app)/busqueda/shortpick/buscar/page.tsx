import { createClient } from "@/lib/supabase/server";
import { BuscarShortpick } from "./Buscar";
import { FiltroSemana } from "@/components/FiltroSemana";

export const dynamic = "force-dynamic";

export default async function Buscar({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const { semana } = await searchParams;
  const supabase = await createClient();
  const { data: ss } = await supabase.from("v_shortpick").select("semana").eq("situacion", "pendiente").limit(50000);
  const semanas = [...new Set((ss ?? []).map((x) => x.semana as string))].sort().reverse();
  let q = supabase.from("v_shortpick")
    .select("id,dia,area,cod_alternat,descripcion,ubicacion,faltante,valor,situacion,cantidad_encontrada,ubicacion_encontrada,comentario,fotos")
    .eq("situacion", "pendiente").order("ubicacion").limit(1000);
  if (semana) q = q.eq("semana", semana);
  const { data } = await q;
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2"><h1 className="text-xl font-extrabold">Búsqueda de shortpick</h1><FiltroSemana semanas={semanas} actual={semana} /></div>
      {!data?.length ? <p className="rounded-xl bg-tarjeta p-6 text-sm text-suave">✓ No hay líneas pendientes de búsqueda.</p> : <BuscarShortpick lineas={data} />}
    </div>
  );
}
