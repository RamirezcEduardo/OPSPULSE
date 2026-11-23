import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fmtFecha } from "@/lib/formato";
import { BLOQUES_5S } from "@/lib/reglas/cincoS";
import { Imprimir } from "./Imprimir";

export const dynamic = "force-dynamic";
const COLOR: Record<string, string> = { Cumple: "bg-green-100 text-green-800", Parcial: "bg-amber-100 text-amber-800", "No cumple": "bg-red-100 text-red-800" };
const barra = (p: number | null) => (p == null ? "bg-borde" : p >= 85 ? "bg-green-600" : p >= 70 ? "bg-blue-600" : p >= 50 ? "bg-amber-500" : "bg-red-600");

export default async function Informe5S({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: a } = await supabase.from("auditoria_5s").select("*").eq("id", id).maybeSingle();
  if (!a) notFound();
  const resp = (a.respuestas ?? {}) as Record<string, string>;
  const fotos = (a.fotos ?? []) as string[];
  const { data: urls } = fotos.length ? await supabase.storage.from("fotos").createSignedUrls(fotos, 3600) : { data: [] };
  const pcts = [a.pct_s1, a.pct_s2, a.pct_s3, a.pct_s4, a.pct_s5] as (number | null)[];
  const obs = BLOQUES_5S.flatMap((b) => b.items.filter(([k]) => resp[k] === "No cumple" || resp[k] === "Parcial").map(([k, t]) => ({ k, t, b: b.nombre, r: resp[k] })));

  return (
    <div className="informe mx-auto flex max-w-4xl flex-col gap-5">
      <div className="flex items-center justify-between gap-2 print:hidden">
        <Link href="/inventario/5s" className="flex items-center gap-1 text-sm text-suave"><ArrowLeft size={16} /> Volver</Link>
        <Imprimir />
      </div>
      <header className="rounded-xl bg-tarjeta p-5">
        <p className="text-sm text-suave">Informe de auditoría 5S · CD11</p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-2xl font-extrabold">{a.area}{a.ubicacion ? ` · ${a.ubicacion}` : ""}</h1>
          <div className="text-right"><p className="text-4xl font-extrabold tabular-nums">{a.pct_total ?? "—"}%</p><p className="text-sm font-bold">{a.nivel}</p></div>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div><dt className="text-suave">Fecha</dt><dd>{fmtFecha(a.fecha + "T12:00:00-05:00")}</dd></div>
          <div><dt className="text-suave">Auditor</dt><dd>{a.nombre_auditor ?? "—"}</dd></div>
          <div><dt className="text-suave">Supervisor</dt><dd>{a.supervisor ?? "—"}</dd></div>
          <div><dt className="text-suave">Observaciones</dt><dd>{obs.length}</dd></div>
        </dl>
      </header>

      <section className="rounded-xl bg-tarjeta p-5">
        <h2 className="mb-3 font-semibold">Resultado por S</h2>
        <div className="flex flex-col gap-2">{BLOQUES_5S.map((b, i) => (
          <div key={b.s} className="flex items-center gap-3 text-sm">
            <span className="w-44 shrink-0">{b.nombre}</span>
            <div className="h-4 flex-1 rounded bg-fondo"><div className={`h-4 rounded ${barra(pcts[i])}`} style={{ width: `${pcts[i] ?? 0}%` }} /></div>
            <span className="w-12 text-right font-bold tabular-nums">{pcts[i] ?? "—"}%</span>
          </div>))}</div>
      </section>

      {(a.hallazgos || a.accion_correctiva) && (
        <section className="rounded-xl bg-tarjeta p-5 text-sm">
          {a.hallazgos && <><h2 className="mb-1 font-semibold">Hallazgos</h2><p className="mb-3 whitespace-pre-line">{a.hallazgos}</p></>}
          {a.accion_correctiva && <><h2 className="mb-1 font-semibold">Acción correctiva</h2><p className="whitespace-pre-line">{a.accion_correctiva}</p></>}
        </section>)}

      <section className="rounded-xl bg-tarjeta p-5">
        <h2 className="mb-3 font-semibold">Puntos a mejorar ({obs.length})</h2>
        {!obs.length ? <p className="text-sm text-suave">✓ Todos los puntos cumplen.</p> :
          <ul className="flex flex-col gap-2 text-sm">{obs.map((o) => (
            <li key={o.k} className="flex items-start justify-between gap-3 border-b border-borde pb-2">
              <span><span className="text-xs text-suave">{o.b}</span><br />{o.t}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${COLOR[o.r]}`}>{o.r}</span></li>))}</ul>}
      </section>

      <section className="rounded-xl bg-tarjeta p-5">
        <h2 className="mb-3 font-semibold">Evidencias fotográficas ({fotos.length})</h2>
        {!fotos.length ? <p className="text-sm text-suave">Sin fotos.</p> :
          <div className="fotos grid grid-cols-1 gap-3 sm:grid-cols-2">{fotos.map((f, k) => urls?.[k]?.signedUrl && (
            <a key={f} href={urls[k].signedUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg break-inside-avoid">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={urls[k].signedUrl} alt={`Evidencia ${k + 1}`} className="max-h-96 w-full object-contain bg-fondo" />
              <p className="mt-1 text-xs text-suave">Foto {k + 1}</p>
            </a>))}</div>}
      </section>

      <details className="rounded-xl bg-tarjeta p-5">
        <summary className="cursor-pointer font-semibold">Detalle completo de respuestas</summary>
        {BLOQUES_5S.map((b) => (
          <div key={b.s} className="mt-3"><h3 className="text-sm font-bold">{b.nombre}</h3>
            <ul className="text-sm">{b.items.map(([k, t]) => (
              <li key={k} className="flex justify-between gap-3 border-b border-borde py-1.5"><span>{t}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${COLOR[resp[k]] ?? "text-suave"}`}>{resp[k] ?? "—"}</span></li>))}</ul></div>))}
      </details>
      <p className="pie hidden justify-between border-t border-borde pt-2 text-[10px] text-suave"><span>OpsPulse · Supply Chain Control · CD11</span><span>Generado el {new Date().toLocaleString("es-PE", { timeZone: "America/Lima" })}</span></p>
    </div>
  );
}
