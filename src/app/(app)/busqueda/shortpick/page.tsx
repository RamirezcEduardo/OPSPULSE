import { createClient } from "@/lib/supabase/server";
import { fmtNum, fmtSoles } from "@/lib/formato";
import { Barras, Kpis, agrupar } from "@/components/Graficos";
import { CargarShortpick } from "./Cargar";

export const dynamic = "force-dynamic";
type S = { id: number; dia: string; semana: string; area: string; cod_alternat: string; descripcion: string | null; ubicacion: string; faltante: number; valor: number; sin_costo: boolean; situacion: string; pendiente: number; valor_pendiente: number; cantidad_encontrada: number | null };

export default async function ShortpickPage({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: cl } = await supabase.auth.getClaims();
  const { data: perfil } = await supabase.from("perfil").select("rol").eq("id", cl?.claims?.sub ?? "").maybeSingle();
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  const desde = sp.desde ?? hoy.slice(0, 8) + "01";
  const hasta = sp.hasta ?? hoy;
  const { data, error } = await supabase.from("v_shortpick").select("id,dia,semana,area,cod_alternat,descripcion,ubicacion,faltante,valor,sin_costo,situacion,pendiente,valor_pendiente,cantidad_encontrada")
    .gte("dia", desde).lte("dia", hasta).limit(50000);
  const r = (data ?? []) as S[];
  const und = r.reduce((s, x) => s + Number(x.faltante), 0);
  const val = r.reduce((s, x) => s + Number(x.valor), 0);
  const rec = r.reduce((s, x) => s + Number(x.cantidad_encontrada ?? 0), 0);
  const valPend = r.reduce((s, x) => s + Number(x.valor_pendiente), 0);
  const pend = r.filter((x) => x.situacion === "pendiente").length;
  const inp = "h-10 rounded-lg border border-borde bg-tarjeta px-2 text-sm text-texto";
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm text-suave">Control de búsqueda de incidencias</p><h1 className="text-2xl font-extrabold">Shortpick</h1></div>
        <form className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-suave">Desde<input type="date" name="desde" defaultValue={desde} className={inp} /></label>
          <label className="flex flex-col gap-1 text-xs text-suave">Hasta<input type="date" name="hasta" defaultValue={hasta} className={inp} /></label>
          <button className="h-10 rounded-lg border border-borde bg-tarjeta px-3 text-sm">Filtrar</button>
        </form>
      </header>
      {perfil?.rol === "admin" && <CargarShortpick />}
      {error && <p className="rounded-xl bg-tarjeta p-4 text-sm text-marca-oscuro">{error.message}</p>}
      {!r.length ? <p className="rounded-xl bg-tarjeta p-6 text-sm text-suave">Sin líneas de shortpick en el rango.</p> : (<>
        <Kpis items={[
          { t: "Líneas", v: fmtNum(r.length) }, { t: "Unidades faltantes", v: fmtNum(und) },
          { t: "Valor", v: fmtSoles(val), s: `${r.filter((x) => x.sin_costo).length} líneas sin costo` },
          { t: "Recuperado", v: fmtNum(rec), s: "unidades encontradas" },
          { t: "Por buscar", v: fmtNum(pend), alerta: pend > 0 }, { t: "Valor pendiente", v: fmtSoles(valPend), alerta: valPend > 0 },
        ]} />
        <div className="grid gap-4 lg:grid-cols-2">
          <Barras titulo="Evolución diaria (líneas)" datos={agrupar(r, (x) => x.dia).sort((a, b) => a[0].localeCompare(b[0])).slice(-31)} />
          <Barras titulo="Estado de la búsqueda" datos={agrupar(r, (x) => x.situacion)} />
          <Barras titulo="Por área (S/)" datos={agrupar(r, (x) => x.area, (x) => Number(x.valor)).slice(0, 12)} fmt={fmtSoles} />
          <Barras titulo="Top ubicaciones (líneas)" datos={agrupar(r, (x) => x.ubicacion).slice(0, 12)} />
          <Barras titulo="Top 15 SKUs (S/)" datos={agrupar(r, (x) => `${x.cod_alternat} ${x.descripcion ?? ""}`.slice(0, 40), (x) => Number(x.valor)).slice(0, 15)} fmt={fmtSoles} />
          <Barras titulo="Evolución semanal (S/)" datos={agrupar(r, (x) => x.semana, (x) => Number(x.valor)).sort((a, b) => a[0].localeCompare(b[0]))} fmt={fmtSoles} />
        </div>
      </>)}
    </div>
  );
}
