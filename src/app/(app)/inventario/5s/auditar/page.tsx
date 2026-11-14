import { createClient } from "@/lib/supabase/server";
import { Formulario5S } from "./Formulario";

export const dynamic = "force-dynamic";

const AREAS_BASE = ["ESTANTERIA 1", "ESTANTERIA 2", "MEZZANINE 1", "MEZZANINE 2", "KNAPP MANUAL", "AFRAME", "ADAPTO", "RESERVA", "RECEPCION", "DESPACHO", "MERMA", "CONTROLADOS"];

export default async function Auditar5S() {
  const supabase = await createClient();
  const [{ data }, { data: par }] = await Promise.all([
    supabase.from("auditoria_5s").select("area, supervisor").order("creado_en", { ascending: false }).limit(500),
    supabase.from("parametro").select("valor").eq("clave", "supervisores").maybeSingle(),
  ]);
  const areas = [...new Set([...(data ?? []).map((d) => d.area as string), ...AREAS_BASE].filter(Boolean))].sort();
  const supervisores = [...new Set([...((par?.valor as string[]) ?? []), ...(data ?? []).map((d) => d.supervisor as string)].filter(Boolean))].sort();
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-3">
      <h1 className="text-lg font-extrabold">Auditoría 5S · CD11</h1>
      <Formulario5S hoy={hoy} areas={areas} supervisores={supervisores} />
    </div>
  );
}
