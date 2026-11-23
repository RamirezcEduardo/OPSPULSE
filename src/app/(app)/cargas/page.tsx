import { createClient } from "@/lib/supabase/server";
import { obtenerPermisos } from "@/lib/permisos";
import { fmtFecha } from "@/lib/formato";
import { APARTADOS, GESTIONES, TABLA_CARGA, type Gestion } from "./fuentes";
import { DescargarApartado, DescargarCarga, EliminarCarga, Restablecer } from "./Botones";

export const dynamic = "force-dynamic";
const fh = (t: string | null) => (t ? new Date(t).toLocaleString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
type G = { tipo: Gestion; id: string; cuando: string | null; quien: string | null; detalle: string; resultado: string };

export default async function Cargas({ searchParams }: { searchParams: Promise<{ tipo?: string; desde?: string }> }) {
  const sp = await searchParams;
  const { rol } = await obtenerPermisos();
  if (rol !== "admin") return <p className="rounded-xl bg-tarjeta p-6 text-sm">Solo los administradores pueden ver el historial de cargas y corregir gestiones.</p>;
  const s = await createClient();
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  const desde = sp.desde ?? new Date(Date.now() - 7 * 864e5).toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  const tipo = (sp.tipo ?? "reabasto") as Gestion;
  const ini = `${desde}T00:00:00-05:00`;

  const [{ data: cargas }, { data: perfiles }] = await Promise.all([
    s.from("carga").select("*").order("cargado_en", { ascending: false }).limit(200),
    s.from("perfil").select("id,nombre,usuario"),
  ]);
  const quien = new Map((perfiles ?? []).map((p) => [p.id as string, (p.nombre || p.usuario) as string]));
  const nom = (u: string | null) => (u ? quien.get(u) ?? "—" : "—");

  let g: G[] = [];
  if (tipo === "reabasto") {
    const { data } = await s.from("auditoria_activo").select("id,ubicacion,cod_alternat,cant_sistema,cant_fisica,diferencia,validado_por,validado_en,auditor_asignado").gte("validado_en", ini).order("validado_en", { ascending: false }).limit(500);
    g = (data ?? []).map((x) => ({ tipo, id: String(x.id), cuando: x.validado_en, quien: nom(x.validado_por) ?? x.auditor_asignado, detalle: `${x.ubicacion} · SKU ${x.cod_alternat}`, resultado: `WMS ${x.cant_sistema} / Físico ${x.cant_fisica} (dif ${x.diferencia})` }));
  } else if (tipo === "shortpick") {
    const { data } = await s.from("shortpick_verificacion").select("id,estado,cantidad_encontrada,ubicacion_encontrada,verificado_por,verificado_en,shortpick_linea(cod_alternat,ubicacion,nro_grupo)").gte("verificado_en", ini).order("verificado_en", { ascending: false }).limit(500);
    g = (data ?? []).map((x) => { const l = (Array.isArray(x.shortpick_linea) ? x.shortpick_linea[0] : x.shortpick_linea) as { cod_alternat?: string; ubicacion?: string; nro_grupo?: string } | null;
      return { tipo, id: String(x.id), cuando: x.verificado_en, quien: nom(x.verificado_por), detalle: `SKU ${l?.cod_alternat ?? "?"} · ${l?.ubicacion ?? ""} · grupo ${l?.nro_grupo ?? "—"}`, resultado: `${x.estado}${x.cantidad_encontrada != null ? ` · ${x.cantidad_encontrada} und` : ""}${x.ubicacion_encontrada ? ` en ${x.ubicacion_encontrada}` : ""}` }; });
  } else if (tipo === "recuperacion") {
    const { data } = await s.from("bulto_recuperacion").select("id,unidades,ubicacion_encontrado,registrado_por,registrado_en,bulto(nro_lpn,cod_alternat,clasificacion)").gte("registrado_en", ini).order("registrado_en", { ascending: false }).limit(500);
    g = (data ?? []).map((x) => { const b = (Array.isArray(x.bulto) ? x.bulto[0] : x.bulto) as { nro_lpn?: string; cod_alternat?: string; clasificacion?: string } | null;
      return { tipo, id: String(x.id), cuando: x.registrado_en, quien: nom(x.registrado_por), detalle: `${b?.clasificacion ?? ""} · LPN ${b?.nro_lpn ?? "?"} · SKU ${b?.cod_alternat ?? ""}`, resultado: `${x.unidades} und${x.ubicacion_encontrado ? ` en ${x.ubicacion_encontrado}` : ""}` }; });
  } else if (tipo === "asn") {
    const { data } = await s.from("asn_gestion").select("nro_asn,causa,accion,estado_gestion,actualizado_por,actualizado_en").gte("actualizado_en", ini).order("actualizado_en", { ascending: false }).limit(500);
    g = (data ?? []).map((x) => ({ tipo, id: x.nro_asn, cuando: x.actualizado_en, quien: nom(x.actualizado_por), detalle: `ASN ${x.nro_asn}`, resultado: [x.estado_gestion, x.causa, x.accion].filter(Boolean).join(" · ") }));
  } else if (tipo === "5s") {
    const { data } = await s.from("auditoria_5s").select("id,area,nombre_auditor,pct_total,nivel,creado_en").gte("creado_en", ini).order("creado_en", { ascending: false }).limit(500);
    g = (data ?? []).map((x) => ({ tipo, id: String(x.id), cuando: x.creado_en, quien: x.nombre_auditor, detalle: x.area ?? "", resultado: `${x.pct_total}% · ${x.nivel}` }));
  } else {
    const { data } = await s.from("incidencia").select("id,tipo,proceso,cod_alternat,ubic_asignada,nombre,creado_en").gte("creado_en", ini).order("creado_en", { ascending: false }).limit(500);
    g = (data ?? []).map((x) => ({ tipo, id: String(x.id), cuando: x.creado_en, quien: x.nombre, detalle: `${x.tipo} · ${x.proceso}`, resultado: [x.cod_alternat, x.ubic_asignada].filter(Boolean).join(" · ") }));
  }
  const borra = tipo === "5s" || tipo === "incidencia";
  const inp = "h-10 rounded-lg border border-borde bg-tarjeta px-2 text-sm text-texto";

  return (
    <div className="flex flex-col gap-5">
      <header><p className="text-sm text-suave">Solo administradores</p><h1 className="text-2xl font-extrabold">Cargas y correcciones</h1></header>

      <section className="rounded-xl bg-tarjeta p-5">
        <h2 className="mb-1 font-semibold">Descargar reporte por apartado</h2>
        <p className="mb-3 text-sm text-suave">Excel con toda la data guardada del apartado.</p>
        <div className="flex flex-wrap gap-2">{APARTADOS.map((a) => <DescargarApartado key={a.id} id={a.id} nombre={a.nombre} />)}</div>
      </section>

      <section className="rounded-xl bg-tarjeta p-5">
        <h2 className="mb-3 font-semibold">Historial de cargas ({cargas?.length ?? 0})</h2>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm">
          <thead className="text-left text-suave"><tr>{["Cargado el", "Apartado", "Archivo", "Filas", "Nuevas", "Duplicadas", "Cargado por", ""].map((h) => <th key={h} className="border-b border-borde px-2 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>{(cargas ?? []).map((c) => (
            <tr key={c.id} className="border-b border-borde">
              <td className="whitespace-nowrap px-2 py-2">{fh(c.cargado_en)}</td><td className="px-2 py-2">{TABLA_CARGA[c.fuente]?.nombre ?? c.fuente}</td>
              <td className="max-w-64 truncate px-2 py-2">{c.archivo}</td><td className="px-2 py-2 tabular-nums">{c.filas ?? "—"}</td>
              <td className="px-2 py-2 tabular-nums">{c.insertadas ?? "—"}</td><td className="px-2 py-2 tabular-nums">{c.duplicadas ?? "—"}</td>
              <td className="px-2 py-2">{nom(c.cargado_por)}</td>
              <td className="px-2 py-2"><div className="flex gap-2"><DescargarCarga id={c.id} fuente={c.fuente} nombre={`${c.fuente} ${String(c.cargado_en).slice(0, 10)}`} /><EliminarCarga id={c.id} fuente={c.fuente} archivo={c.archivo ?? ""} /></div></td>
            </tr>))}</tbody></table></div>
      </section>

      <section className="rounded-xl bg-tarjeta p-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="font-semibold">Corregir gestiones</h2><p className="text-sm text-suave">Si alguien validó mal, restablécelo para que vuelva a pendiente.</p></div>
          <form className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-xs text-suave">Tipo<select name="tipo" defaultValue={tipo} className={inp}>{Object.entries(GESTIONES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label className="flex flex-col gap-1 text-xs text-suave">Desde<input type="date" name="desde" defaultValue={desde} max={hoy} className={inp} /></label>
            <button className="h-10 rounded-lg border border-borde px-3 text-sm">Ver</button>
          </form>
        </div>
        {!g.length ? <p className="text-sm text-suave">Sin registros desde {fmtFecha(desde + "T12:00:00-05:00")}.</p> :
          <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm">
            <thead className="text-left text-suave"><tr>{["Cuándo", "Quién", "Qué", "Resultado registrado", ""].map((h) => <th key={h} className="border-b border-borde px-2 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>{g.map((x) => (
              <tr key={x.id} className="border-b border-borde">
                <td className="whitespace-nowrap px-2 py-2">{fh(x.cuando)}</td><td className="px-2 py-2">{x.quien ?? "—"}</td>
                <td className="px-2 py-2">{x.detalle}</td><td className="px-2 py-2">{x.resultado}</td>
                <td className="px-2 py-2"><Restablecer tipo={x.tipo} id={x.id} eliminar={borra} /></td>
              </tr>))}</tbody></table></div>}
      </section>
    </div>
  );
}
