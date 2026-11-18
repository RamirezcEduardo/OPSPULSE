import { createClient } from "@/lib/supabase/server";
import { fmtFecha, fmtNum } from "@/lib/formato";
import { Barras, Kpis, agrupar } from "@/components/Graficos";

export const dynamic = "force-dynamic";
type I = { id: number; fecha: string; nombre: string | null; turno: string | null; tipo: string | null; proceso: string | null; cod_alternat: string | null; descripcion: string | null;
  ubic_asignada: string | null; unidad: string | null; cantidad: number | null; lpn: string | null; ubicado: boolean | null; ubic_encontrada: string | null; devuelto: boolean | null; comentarios: string | null; fotos: string[] | null };

export default async function Incidencias({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  const desde = sp.desde ?? hoy.slice(0, 8) + "01";
  const hasta = sp.hasta ?? hoy;
  const { data, error } = await supabase.from("incidencia").select("*").gte("fecha", desde).lte("fecha", hasta).order("creado_en", { ascending: false }).limit(1000);
  const r = (data ?? []) as I[];
  // Galería: últimas fotos con URL firmada (bucket privado)
  const rutas = r.flatMap((x) => (x.fotos ?? []).map((f) => ({ f, x }))).slice(0, 24);
  const { data: urls } = rutas.length ? await supabase.storage.from("fotos").createSignedUrls(rutas.map((y) => y.f), 3600) : { data: [] };
  const zona = (u: string | null) => (u ? u.split("-")[0] : null);
  const inp = "h-10 rounded-lg border border-borde bg-tarjeta px-2 text-sm text-texto";
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm text-suave">Control de inventario</p><h1 className="text-2xl font-extrabold">Incidencias</h1></div>
        <form className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-suave">Desde<input type="date" name="desde" defaultValue={desde} className={inp} /></label>
          <label className="flex flex-col gap-1 text-xs text-suave">Hasta<input type="date" name="hasta" defaultValue={hasta} className={inp} /></label>
          <button className="h-10 rounded-lg border border-borde bg-tarjeta px-3 text-sm">Ver</button>
        </form>
      </header>
      {error && <p className="rounded-xl bg-tarjeta p-4 text-sm text-marca-oscuro">{error.message}</p>}
      {!r.length ? <p className="rounded-xl bg-tarjeta p-6 text-sm text-suave">Sin incidencias en el rango. Regístralas desde la pestaña «Registrar».</p> : (<>
        <Kpis items={[
          { t: "Incidencias", v: fmtNum(r.length) }, { t: "Hoy", v: fmtNum(r.filter((x) => x.fecha === hoy).length) },
          { t: "Ubicadas", v: fmtNum(r.filter((x) => x.ubicado).length), s: `${r.length ? Math.round((r.filter((x) => x.ubicado).length / r.length) * 100) : 0}%` },
          { t: "No ubicadas", v: fmtNum(r.filter((x) => x.ubicado === false).length), alerta: r.some((x) => x.ubicado === false) },
          { t: "Devueltas", v: fmtNum(r.filter((x) => x.devuelto).length) }, { t: "Con foto", v: fmtNum(r.filter((x) => x.fotos?.length).length) },
        ]} />
        <div className="grid gap-4 lg:grid-cols-2">
          <Barras titulo="Por tipo de incidencia" datos={agrupar(r, (x) => x.tipo)} />
          <Barras titulo="Por proceso de origen" datos={agrupar(r, (x) => x.proceso)} />
          <Barras titulo="Por zona (ubicación asignada)" datos={agrupar(r, (x) => zona(x.ubic_asignada)).slice(0, 12)} />
          <Barras titulo="Por día" datos={agrupar(r, (x) => x.fecha).sort((a, b) => a[0].localeCompare(b[0]))} />
          <Barras titulo="Reportado por" datos={agrupar(r, (x) => x.nombre).slice(0, 12)} />
          <Barras titulo="Top SKUs" datos={agrupar(r.filter((x) => x.cod_alternat), (x) => `${x.cod_alternat} ${x.descripcion ?? ""}`.slice(0, 40)).slice(0, 10)} />
        </div>
        {rutas.length > 0 && (
          <section className="rounded-xl bg-tarjeta p-5">
            <h2 className="mb-3 font-semibold">Galería de evidencias</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">{rutas.map((y, k) => urls?.[k]?.signedUrl && (
              <a key={y.f} href={urls[k].signedUrl} target="_blank" rel="noreferrer" className="group relative block overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={urls[k].signedUrl} alt={`${y.x.tipo} · ${y.x.ubic_asignada ?? ""}`} className="aspect-square w-full object-cover" loading="lazy" />
                <span className="absolute inset-x-0 bottom-0 bg-black/60 p-1 text-[11px] text-white">{y.x.tipo} · {zona(y.x.ubic_asignada) ?? "—"}</span>
              </a>))}</div>
          </section>)}
        <section className="rounded-xl bg-tarjeta p-5">
          <h2 className="mb-3 font-semibold">Registro</h2>
          <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-sm">
            <thead className="text-left text-suave"><tr>{["Fecha", "Reportó", "Tipo", "Proceso", "SKU", "Descripción", "Ubic. asignada", "Cant.", "LPN", "¿Ubicado?", "Encontrada en", "¿Devuelto?", "Comentarios"].map((h) => <th key={h} className="border-b border-borde px-2 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>{r.map((x) => (
              <tr key={x.id} className="border-b border-borde align-top">
                <td className="whitespace-nowrap px-2 py-2">{fmtFecha(x.fecha + "T12:00:00-05:00")}</td><td className="px-2 py-2">{x.nombre ?? "—"}</td>
                <td className="px-2 py-2">{x.tipo}</td><td className="px-2 py-2">{x.proceso}</td><td className="px-2 py-2">{x.cod_alternat ?? "—"}</td>
                <td className="max-w-48 truncate px-2 py-2">{x.descripcion ?? "—"}</td><td className="px-2 py-2 font-mono text-xs">{x.ubic_asignada ?? "—"}</td>
                <td className="px-2 py-2 tabular-nums">{x.cantidad ?? "—"} {x.unidad ?? ""}</td><td className="px-2 py-2 font-mono text-xs">{x.lpn ?? "—"}</td>
                <td className="px-2 py-2">{x.ubicado == null ? "—" : x.ubicado ? "Sí" : "No"}</td><td className="px-2 py-2 font-mono text-xs">{x.ubic_encontrada ?? "—"}</td>
                <td className="px-2 py-2">{x.devuelto == null ? "—" : x.devuelto ? "Sí" : "No"}</td><td className="max-w-56 px-2 py-2 text-xs">{x.comentarios ?? ""}</td>
              </tr>))}</tbody></table></div>
        </section>
      </>)}
    </div>
  );
}
