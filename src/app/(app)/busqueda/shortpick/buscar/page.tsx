import { createClient } from "@/lib/supabase/server";
import { BuscarShortpick } from "./Buscar";

export const dynamic = "force-dynamic";

export default async function Buscar() {
  const supabase = await createClient();
  const { data } = await supabase.from("v_shortpick")
    .select("id,dia,area,cod_alternat,descripcion,ubicacion,faltante,valor,situacion,cantidad_encontrada,ubicacion_encontrada,comentario,fotos")
    .eq("situacion", "pendiente").order("ubicacion").limit(1000);
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-3">
      <h1 className="text-xl font-extrabold">Búsqueda de shortpick</h1>
      {!data?.length ? <p className="rounded-xl bg-tarjeta p-6 text-sm text-suave">✓ No hay líneas pendientes de búsqueda.</p> : <BuscarShortpick lineas={data} />}
    </div>
  );
}
