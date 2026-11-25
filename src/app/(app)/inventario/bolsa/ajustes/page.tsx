import { createClient } from "@/lib/supabase/server";
import { obtenerPermisos } from "@/lib/permisos";
import { fmtFecha, fmtNum, fmtSoles } from "@/lib/formato";
import { COLS_AM, FormAjustes, QuitarAjuste } from "./Form";

export const dynamic = "force-dynamic";
export default async function Ajustes() {
  const s = await createClient();
  const { nivel } = await obtenerPermisos();
  const editar = nivel("/inventario/bolsa") === "editar";
  const { data } = await s.from("ajuste").select("id,fecha,nro_grupo,cod_alternat,descripcion_archivo,ubicacion,un_ajuste,monto_manual,tipo,motivo_op,comentario").eq("fuente", "MANUAL").order("fecha");
  const r = data ?? [];
  const porQ = new Map<string, number>();
  r.forEach((x) => { const q = `Q${Math.floor((Number(String(x.fecha).slice(5, 7)) - 1) / 3) + 1}`; porQ.set(q, (porQ.get(q) ?? 0) + Number(x.monto_manual)); });
  const motivos = [...new Set(["DIFERENCIA VALORIZACION", "AJUSTE ACTIVO", "AJUSTE RESERVA LPN", "SHORTPICK", "CREACION LPN", "AJUSTE DROP", "VAS", ...r.map((x) => x.motivo_op as string)])].sort();
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  return (
    <div className="flex flex-col gap-4">
      <header><p className="text-sm text-suave">Bolsa de inventario</p><h1 className="text-2xl font-extrabold">Ajustes manuales del auditor</h1>
        <p className="text-xs text-suave">Ajustes que no salen del WMS: líneas de cierre y cuadres con el cierre oficial (DIFERENCIA VALORIZACION). Suman a la bolsa con Gestión CONSIDERAR.</p></header>
      {editar && <FormAjustes hoy={hoy} motivos={motivos} />}
      <section className="flex flex-wrap gap-2">{["Q1", "Q2", "Q3", "Q4"].map((q) => <div key={q} className="rounded-xl bg-tarjeta px-4 py-3"><p className="text-xs text-suave">Ajustes manuales {q}</p><p className={`text-lg font-bold ${(porQ.get(q) ?? 0) < 0 ? "text-marca" : ""}`}>{fmtSoles(porQ.get(q) ?? 0)}</p></div>)}</section>
      <section className="rounded-xl bg-tarjeta p-5">
        <h2 className="mb-3 font-semibold">Registros ({fmtNum(r.length)})</h2>
        <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-grafito text-left text-white"><tr>{[...COLS_AM, ""].map((h) => <th key={h} className="px-2 py-2 font-semibold">{h}</th>)}</tr></thead>
          <tbody>{r.map((x) => (
            <tr key={x.id} className="border-b border-borde"><td className="whitespace-nowrap px-2 py-1">{fmtFecha(x.fecha)}</td><td className="px-2 py-1">{x.nro_grupo}</td><td className="px-2 py-1">{x.cod_alternat}</td>
              <td className="px-2 py-1">{x.descripcion_archivo}</td><td className="px-2 py-1">{x.ubicacion}</td><td className="px-2 py-1 text-right">{fmtNum(Number(x.un_ajuste))}</td>
              <td className={`px-2 py-1 text-right tabular-nums ${Number(x.monto_manual) < 0 ? "text-marca" : ""}`}>{fmtSoles(Number(x.monto_manual))}</td><td className="px-2 py-1">{x.tipo}</td><td className="px-2 py-1">{x.motivo_op}</td>
              <td className="px-2 py-1 text-xs">{x.comentario}</td><td className="px-2 py-1">{editar && <QuitarAjuste id={x.id} />}</td></tr>))}</tbody></table></div>
      </section>
    </div>
  );
}
