import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fmtNum } from "@/lib/formato";
import { FormAuditoria } from "./Form";

export const dynamic = "force-dynamic";

export default async function Auditar({ params }: { params: Promise<{ clave: string }> }) {
  const clave = decodeURIComponent((await params).clave);
  const supabase = await createClient();
  const [{ data: t }, { data: h }] = await Promise.all([
    supabase.from("v_tarea_reabasto").select("*").eq("clave", clave).maybeSingle(),
    supabase.from("parametro").select("valor").eq("clave", "hallazgos_reabasto").maybeSingle(),
  ]);
  if (!t) notFound();
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <Link href="/operaciones/reabasto" className="text-sm text-suave hover:text-marca">← Auditoría de reabasto</Link>
      <section className="rounded-xl bg-tarjeta p-5 text-sm">
        <p className="text-xs text-suave">{t.motivo_seleccion ?? "MANUAL"} · {t.tipo_asignac} · {t.estado}</p>
        <h1 className="mt-1 text-lg font-bold">{t.cod_alternat} · {t.descripcion}</h1>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
          <dt className="text-suave">Destino</dt><dd className="font-mono">{t.ubic_destino}</dd>
          <dt className="text-suave">Cantidad</dt><dd>{fmtNum(t.cantidad)}</dd>
          <dt className="text-suave">LPN</dt><dd className="font-mono text-xs">{t.nro_lpn}</dd>
          <dt className="text-suave">Lote / venc.</dt><dd>{t.lote ?? "—"} / {t.fecha_prioritaria ?? "—"}</dd>
          <dt className="text-suave">Usuario</dt><dd>{t.usuario}</dd>
          <dt className="text-suave">Tarea</dt><dd className="font-mono text-xs">{t.nro_tarea}</dd>
        </dl>
      </section>
      <FormAuditoria t={t} hallazgos={(h?.valor as string[]) ?? []} />
    </div>
  );
}
