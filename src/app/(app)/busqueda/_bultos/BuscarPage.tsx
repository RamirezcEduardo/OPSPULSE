import { createClient } from "@/lib/supabase/server";
import { BuscarBultos } from "./Buscar";
import { FiltroSemana } from "@/components/FiltroSemana";

export async function BuscarBultosPage({ clas, titulo, semana }: { clas: "perdidos" | "sin_ubicacion"; titulo: string; semana?: string }) {
  const supabase = await createClient();
  const { data: ss } = await supabase.from("v_bulto").select("semana_calc").eq("clasificacion", clas).in("estado", ["pendiente", "parcial"]).limit(20000);
  const semanas = [...new Set((ss ?? []).map((x) => x.semana_calc as string).filter(Boolean))].sort().reverse();
  let q = supabase.from("v_bulto")
    .select("id,nro_lpn,cod_alternat,descripcion,ubicacion,area,cantidad_actual,unidades_recuperadas,unidades_pendientes,val_tot,valor_total,valor_pendiente,estado,dias_demora,alerta,supervisor")
    .eq("clasificacion", clas).in("estado", ["pendiente", "parcial"]).order("dias_demora", { ascending: false }).limit(1000);
  if (semana) q = q.eq("semana_calc", semana);
  const { data } = await q;
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2"><h1 className="text-xl font-extrabold">{titulo}</h1><FiltroSemana semanas={semanas} actual={semana} /></div>
      {!data?.length ? <p className="rounded-xl bg-tarjeta p-6 text-sm text-suave">✓ No hay bultos pendientes.</p> : <BuscarBultos clas={clas} bultos={data} />}
    </div>
  );
}
