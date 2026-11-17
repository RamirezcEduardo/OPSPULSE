import Link from "next/link";
import { exigirAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TABLAS: Record<string, string> = {
  carga: "Carga de archivo", no_considerar: "No considerar", cruce: "Cruce", auditoria_reabasto: "Validación de reabasto",
  auditoria_5s: "Auditoría 5S", shortpick_verificacion: "Búsqueda de shortpick", bulto_recuperacion: "Recuperación de bulto",
  bulto: "Bulto (responsables/estado)", perfil: "Usuario / rol", permiso_modulo: "Permisos", parametro: "Parámetros",
  asn_gestion: "Gestión de ASN", incidencia: "Incidencia",
};
const ACC: Record<string, string> = { INSERT: "Creó", UPDATE: "Editó", DELETE: "Eliminó" };

function resumen(t: string, a: string, antes: Record<string, unknown> | null, despues: Record<string, unknown> | null) {
  const d = despues ?? antes ?? {};
  if (t === "carga") return `${d.fuente} · ${d.archivo ?? ""} · ${d.filas ?? ""} filas`;
  if (t === "cruce" && antes && despues && antes.decision !== despues.decision) return `Decisión: ${antes.decision} → ${despues.decision}`;
  if (t === "perfil" && antes && despues && antes.rol !== despues.rol) return `Rol: ${antes.rol} → ${despues.rol}`;
  if (t === "permiso_modulo") return `${d.sujeto_tipo} ${d.sujeto} · ${d.modulo} · ${a === "DELETE" ? "según rol" : d.nivel}`;
  if (t === "no_considerar") return `Grupo ${d.nro_grupo} ${d.cod_alternat ?? ""} · ${d.motivo}`;
  if (t === "bulto_recuperacion") return `Bulto ${d.bulto_id} · ${d.unidades} und`;
  if (t === "shortpick_verificacion") return `Línea ${d.linea_id} · ${d.estado} · ${d.cantidad_encontrada} und`;
  if (t === "bulto" && antes && despues) {
    const c = ["supervisor", "usuario_causo", "estado", "fecha_levantamiento"].filter((k) => antes[k] !== despues[k]);
    return c.map((k) => `${k}: ${antes[k] ?? "—"} → ${despues[k] ?? "—"}`).join(" · ");
  }
  if (antes && despues) {
    const c = Object.keys(despues).filter((k) => JSON.stringify(antes[k]) !== JSON.stringify(despues[k]) && !k.endsWith("_en")).slice(0, 4);
    return c.map((k) => `${k}: ${String(antes[k] ?? "—")} → ${String(despues[k] ?? "—")}`).join(" · ");
  }
  return "";
}

export default async function Bitacora({ searchParams }: { searchParams: Promise<{ tabla?: string; desde?: string; hasta?: string }> }) {
  await exigirAdmin();
  const sp = await searchParams;
  const supabase = await createClient();
  let q = supabase.from("bitacora").select("*").order("fecha", { ascending: false }).limit(500);
  if (sp.tabla) q = q.eq("tabla", sp.tabla);
  if (sp.desde) q = q.gte("fecha", `${sp.desde}T00:00:00-05:00`);
  if (sp.hasta) q = q.lte("fecha", `${sp.hasta}T23:59:59-05:00`);
  const { data, error } = await q;
  const inp = "h-10 rounded-lg border border-borde bg-tarjeta px-2 text-sm text-texto";
  const fh = (d: string) => new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", dateStyle: "short", timeStyle: "short" }).format(new Date(d));
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><Link href="/configuracion" className="text-sm text-suave hover:text-marca">← Configuración</Link><h1 className="text-2xl font-extrabold">Bitácora</h1>
          <p className="text-sm text-suave">Quién cargó, editó, validó o cambió algo, y cuándo. Últimos 500 movimientos.</p></div>
        <form className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-suave">Tipo<select name="tabla" defaultValue={sp.tabla ?? ""} className={inp}><option value="">Todos</option>{Object.entries(TABLAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="flex flex-col gap-1 text-xs text-suave">Desde<input type="date" name="desde" defaultValue={sp.desde} className={inp} /></label>
          <label className="flex flex-col gap-1 text-xs text-suave">Hasta<input type="date" name="hasta" defaultValue={sp.hasta} className={inp} /></label>
          <button className="h-10 rounded-lg border border-borde bg-tarjeta px-3 text-sm">Filtrar</button>
        </form>
      </header>
      {error && <p className="rounded-xl bg-tarjeta p-4 text-sm text-marca-oscuro">{error.message}</p>}
      <section className="rounded-xl bg-tarjeta p-5">
        {!data?.length ? <p className="text-sm text-suave">Sin movimientos registrados.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-suave"><tr>{["Fecha", "Usuario", "Acción", "Qué", "Detalle"].map((h) => <th key={h} className="border-b border-borde px-2 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>{data.map((b) => (
              <tr key={b.id} className="border-b border-borde align-top">
                <td className="whitespace-nowrap px-2 py-2">{fh(b.fecha)}</td>
                <td className="px-2 py-2">{b.usuario}</td>
                <td className="px-2 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${b.accion === "DELETE" ? "bg-red-100 text-red-800" : b.accion === "INSERT" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}>{ACC[b.accion] ?? b.accion}</span></td>
                <td className="px-2 py-2">{TABLAS[b.tabla] ?? b.tabla}</td>
                <td className="px-2 py-2 text-xs text-suave">{resumen(b.tabla, b.accion, b.antes, b.despues)}</td>
              </tr>))}</tbody></table></div>)}
      </section>
    </div>
  );
}
