import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fmtFecha } from "@/lib/formato";
import { Imprimir } from "@/app/(app)/inventario/5s/informe/[id]/Imprimir";

export const dynamic = "force-dynamic";
const sn = (b: boolean | null) => (b == null ? "—" : b ? "Sí" : "No");

export default async function InformeIncidencia({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: x } = await supabase.from("incidencia").select("*").eq("id", id).maybeSingle();
  if (!x) notFound();
  const fotos = (x.fotos ?? []) as string[];
  const { data: urls } = fotos.length ? await supabase.storage.from("fotos").createSignedUrls(fotos, 3600) : { data: [] };
  const datos: [string, React.ReactNode][] = [
    ["Fecha", fmtFecha(x.fecha + "T12:00:00-05:00")], ["Reportó", x.nombre ?? "—"], ["Proceso", x.proceso ?? "—"],
    ["SKU", x.cod_alternat ?? "—"], ["Descripción", x.descripcion ?? "—"], ["Cantidad", `${x.cantidad ?? "—"} ${x.unidad ?? ""}`], ["LPN / CJ", x.lpn ?? "—"],
    ["Ubicación asignada", <span key="a" className="font-mono">{x.ubic_asignada ?? "—"}</span>], ["Encontrada en", <span key="e" className="font-mono">{x.ubic_encontrada ?? "—"}</span>],
    ["¿Ubicado?", sn(x.ubicado)], ["¿Devuelto?", sn(x.devuelto)],
  ];
  return (
    <div className="informe mx-auto flex max-w-4xl flex-col gap-5">
      <div className="flex items-center justify-between gap-2 print:hidden">
        <Link href="/inventario/incidencias" className="flex items-center gap-1 text-sm text-suave"><ArrowLeft size={16} /> Volver</Link>
        <Imprimir />
      </div>
      <header className="rounded-xl bg-tarjeta p-5">
        <p className="text-sm text-suave">Informe de incidencia · CD11 · N.º {x.id}</p>
        <h1 className="text-2xl font-extrabold">{x.tipo}</h1>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">{datos.map(([k, v]) => <div key={k}><dt className="text-suave">{k}</dt><dd className="font-medium">{v}</dd></div>)}</dl>
        {x.comentarios && <div className="mt-4 text-sm"><p className="text-suave">Comentarios</p><p className="whitespace-pre-line">{x.comentarios}</p></div>}
      </header>
      <section className="rounded-xl bg-tarjeta p-5">
        <h2 className="mb-3 font-semibold">Evidencias fotográficas ({fotos.length})</h2>
        {!fotos.length ? <p className="text-sm text-suave">Sin fotos.</p> :
          <div className="fotos grid grid-cols-1 gap-3 sm:grid-cols-2">{fotos.map((f, k) => urls?.[k]?.signedUrl && (
            <a key={f} href={urls[k].signedUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={urls[k].signedUrl} alt={`Evidencia ${k + 1}`} className="max-h-[28rem] w-full bg-fondo object-contain" />
            </a>))}</div>}
      </section>
      <p className="pie hidden justify-between border-t border-borde pt-2 text-[10px] text-suave"><span>OpsPulse · Supply Chain Control · CD11</span><span>Generado el {new Date().toLocaleString("es-PE", { timeZone: "America/Lima" })}</span></p>
    </div>
  );
}
