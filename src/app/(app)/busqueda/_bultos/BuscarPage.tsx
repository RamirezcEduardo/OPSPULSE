import { createClient } from "@/lib/supabase/server";
import { BuscarBultos } from "./Buscar";

export async function BuscarBultosPage({ clas, titulo }: { clas: "perdidos" | "sin_ubicacion"; titulo: string }) {
  const supabase = await createClient();
  const { data } = await supabase.from("v_bulto")
    .select("id,nro_lpn,cod_alternat,descripcion,ubicacion,area,cantidad_actual,unidades_recuperadas,unidades_pendientes,val_tot,valor_pendiente,estado,dias_demora,alerta,supervisor")
    .eq("clasificacion", clas).in("estado", ["pendiente", "parcial"]).order("dias_demora", { ascending: false }).limit(1000);
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-3">
      <h1 className="text-xl font-extrabold">{titulo}</h1>
      {!data?.length ? <p className="rounded-xl bg-tarjeta p-6 text-sm text-suave">✓ No hay bultos pendientes.</p> : <BuscarBultos clas={clas} bultos={data} />}
    </div>
  );
}
