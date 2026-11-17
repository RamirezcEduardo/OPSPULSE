import { createClient } from "@/lib/supabase/server";
import { fmtFecha } from "@/lib/formato";
import { ValidarActivos } from "./ValidarActivos";

export const dynamic = "force-dynamic";

export default async function Validar({ searchParams }: { searchParams: Promise<{ fecha?: string }> }) {
  const { fecha: fp } = await searchParams;
  const supabase = await createClient();
  const { data: cl } = await supabase.auth.getClaims();
  const { data: perfil } = await supabase.from("perfil").select("nombre").eq("id", cl?.claims?.sub ?? "").maybeSingle();
  const { data: fs } = await supabase.from("auditoria_activo").select("fecha").order("fecha", { ascending: false }).limit(5000);
  const fechas = [...new Set((fs ?? []).map((x) => x.fecha as string))];
  const fecha = fp && fechas.includes(fp) ? fp : fechas[0];
  const { data } = fecha ? await supabase.from("auditoria_activo").select("*").eq("fecha", fecha).order("ubicacion") : { data: [] };
  const miNombre = (perfil?.nombre ?? "").split(" ")[0].toUpperCase();
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-xl font-extrabold">Validación de reabasto</h1>
        {fechas.length > 0 && (
          <form className="flex items-end gap-2">
            <label className="flex flex-col gap-1 text-xs text-suave">Fecha
              <select name="fecha" defaultValue={fecha} className="h-10 rounded-lg border border-borde bg-tarjeta px-2 text-sm text-texto">
                {fechas.map((f) => <option key={f} value={f}>{fmtFecha(f + "T12:00:00-05:00")}</option>)}
              </select></label>
            <button className="h-10 rounded-lg border border-borde bg-tarjeta px-3 text-sm">Ver</button>
          </form>)}
      </div>
      {!data?.length ? <p className="rounded-xl bg-tarjeta p-6 text-sm text-suave">No hay activos asignados para auditar.</p>
        : <ValidarActivos filas={data} miNombre={miNombre} />}
    </div>
  );
}
