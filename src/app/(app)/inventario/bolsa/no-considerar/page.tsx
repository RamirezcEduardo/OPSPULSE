import { createClient } from "@/lib/supabase/server";
import { obtenerPermisos } from "@/lib/permisos";
import { fmtFecha, fmtNum } from "@/lib/formato";
import { FormNoConsiderar, Quitar } from "./Form";

export const dynamic = "force-dynamic";
export default async function NoConsiderar({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const s = await createClient();
  const { nivel } = await obtenerPermisos();
  const editar = nivel("/inventario/bolsa") === "editar";
  let qq = s.from("no_considerar").select("id,nro_grupo,cod_alternat,motivo,comentario,registrado_en", { count: "exact" }).order("id", { ascending: false }).limit(200);
  if (q) qq = qq.or(`nro_grupo.eq.${q.replace(/[^\w-]/g, "")},cod_alternat.eq.${q.replace(/[^\w-]/g, "")}`);
  const [{ data, count }, { data: ms }] = await Promise.all([qq, s.from("no_considerar").select("motivo").limit(5000)]);
  const motivos = [...new Set(["AJUSTE SIEMBRA", "REVERSA MANUAL AUDITOR", ...(ms ?? []).map((x) => x.motivo as string)])].filter(Boolean).sort();
  return (
    <div className="flex flex-col gap-4">
      <header><p className="text-sm text-suave">Bolsa de inventario</p><h1 className="text-2xl font-extrabold">No considerar</h1></header>
      {editar ? <FormNoConsiderar motivos={motivos} /> : <p className="rounded-xl bg-tarjeta p-4 text-sm text-suave">Solo lectura: pide permiso de edición en la bolsa para agregar exclusiones.</p>}
      <section className="rounded-xl bg-tarjeta p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Registros ({fmtNum(count ?? 0)})</h2>
          <form className="flex gap-2"><input name="q" defaultValue={q} placeholder="Buscar Nro Grupo o SKU" className="h-10 rounded-lg border border-borde bg-tarjeta px-3 text-sm" /><button className="h-10 rounded-lg border border-borde px-3 text-sm">Buscar</button></form>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
          <thead className="bg-grafito text-left text-white"><tr>{["Nro Grupo", "Cod Alternat (opcional)", "Motivo auditor", "Comentario", "Fecha registro", ""].map((h) => <th key={h} className="px-2 py-2 font-semibold">{h}</th>)}</tr></thead>
          <tbody>{(data ?? []).map((x) => (
            <tr key={x.id} className="border-b border-borde"><td className="px-2 py-1.5">{x.nro_grupo}</td><td className="px-2 py-1.5">{x.cod_alternat || "(todo el grupo)"}</td><td className="px-2 py-1.5">{x.motivo}</td>
              <td className="px-2 py-1.5 text-xs">{x.comentario}</td><td className="px-2 py-1.5">{x.registrado_en ? fmtFecha(x.registrado_en) : "—"}</td><td className="px-2 py-1.5">{editar && <Quitar id={x.id} />}</td></tr>))}</tbody></table></div>
        {(count ?? 0) > 200 && <p className="mt-2 text-xs text-suave">Se muestran los 200 más recientes; usa el buscador.</p>}
      </section>
    </div>
  );
}
