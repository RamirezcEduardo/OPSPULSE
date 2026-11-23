import { createClient } from "@/lib/supabase/server";
import { fmtNum, fmtSoles } from "@/lib/formato";
import { Barras, Kpis } from "@/components/Graficos";
import { Lineas } from "@/components/Lineas";
import { eriDe, eriMensual, fp, nomMes } from "../datos";

export const dynamic = "force-dynamic";
type Top = { cod_alternat: string; descripcion: string | null; costo: number | null; meses: number; meses_dif: number; faltante: number; sobrante: number; neto: number; neto_s: number | null };
const tono = (x: number | null) => (x == null ? "" : x >= 0.95 ? "text-green-700 dark:text-green-400" : x >= 0.85 ? "text-amber-600" : "text-marca");
const soles = (x: number | null) => (x == null ? "—" : fmtSoles(x));

export default async function Eri() {
  const s = await createClient();
  const [mens, { data: ar }, { data: tp }] = await Promise.all([eriMensual(), s.rpc("eri_area"), s.rpc("eri_top", { p_n: 40 })]);
  const areaRows = (ar ?? []) as { mes: string; area: string; skus: number; con_dif: number }[];
  const top = (tp ?? []) as Top[];
  const meses = mens.map((x) => x.mes);
  const ult = mens.at(-1), ant = mens.at(-2);
  const validos = mens.filter((x) => x.skus >= 20);
  const prom = validos.length ? validos.reduce((a, x) => a + x.eri, 0) / validos.length : 0;
  const bruto = mens.reduce((a, x) => a + Number(x.bruto), 0), neta = mens.reduce((a, x) => a + Number(x.neta), 0);
  const conCosto = mens.some((x) => x.falt_s != null);
  const netoS = mens.reduce((a, x) => a + Number(x.sobr_s ?? 0) - Number(x.falt_s ?? 0), 0);

  // ERI por área: meses como columnas, promedio de meses con ≥20 SKUs
  const areas = [...new Set(areaRows.map((x) => x.area))];
  const tabla = areas.map((a) => {
    const porMes = new Map(areaRows.filter((x) => x.area === a).map((x) => [x.mes, x]));
    const vals = [...porMes.values()].filter((x) => x.skus >= 20).map((x) => eriDe(x.skus, x.con_dif));
    return { a, porMes, prom: vals.length ? vals.reduce((p, v) => p + v, 0) / vals.length : null, skus: [...porMes.values()].reduce((p, x) => p + x.skus, 0) };
  }).sort((x, y) => (x.prom ?? 2) - (y.prom ?? 2));
  const semaforo = (v: number) => (v >= 95 ? "bg-green-600" : v >= 85 ? "bg-amber-400" : "bg-red-600");
  const th = "px-2 py-2 text-right font-semibold";

  return (
    <div className="flex flex-col gap-5">
      <header><p className="text-sm text-suave">Control de inventario</p><h1 className="text-2xl font-extrabold">ERI · Exactitud de registro de inventario por SKU</h1>
        <p className="max-w-4xl text-xs text-suave">ERI por SKU = SKUs contados sin diferencia neta ÷ SKUs contados. La diferencia se netea por SKU en todo el CD y en el mes (faltante en una ubicación compensado con sobrante en otra = sin error).</p></header>
      {!mens.length ? <p className="rounded-xl bg-tarjeta p-6 text-sm text-suave">Sin datos. Carga los archivos ERU mensuales desde «Resumen».</p> : (<>
        <Kpis items={[
          { t: `ERI por SKU · ${ant ? nomMes(ant.mes) : "—"}`, v: <span className={tono(ant?.eri ?? null)}>{ant ? fp(ant.eri) : "—"}</span> },
          { t: `ERI por SKU · ${ult ? nomMes(ult.mes) : "—"}`, v: <span className={tono(ult?.eri ?? null)}>{ult ? fp(ult.eri) : "—"}</span> },
          { t: `SKUs con diferencia · ${ult ? nomMes(ult.mes) : ""}`, v: ult ? fmtNum(ult.con_dif) : "—" },
          { t: "% de ajustes que son cruces · año", v: bruto ? fp(1 - neta / bruto) : "—" },
          { t: "Neto S/ · año", v: conCosto ? fmtSoles(netoS) : "—", s: conCosto ? undefined : "falta cargar costos", alerta: netoS < 0 },
          { t: "ERI promedio 2026", v: <span className={tono(prom)}>{fp(prom)}</span> },
        ]} />
        <div className="grid gap-4 lg:grid-cols-2">
          <Lineas titulo="ERI mensual" etiquetas series={["ERI"]} datos={mens.map((x) => ({ x: nomMes(x.mes), ERI: Math.round(x.eri * 1000) / 10 }))} />
          <Barras titulo="ERI por área · promedio 2026" max={100} color={semaforo} fmt={(n) => `${n.toFixed(1)}%`}
            datos={tabla.filter((x) => x.prom != null).map((x) => [x.a, Math.round(x.prom! * 1000) / 10] as [string, number])}
            leyenda={<><span className="flex items-center gap-1"><i className="inline-block h-3 w-3 bg-red-600" />Menor a 85%</span><span className="flex items-center gap-1"><i className="inline-block h-3 w-3 bg-amber-400" />85% a 95%</span><span className="flex items-center gap-1"><i className="inline-block h-3 w-3 bg-green-600" />Desde 95%</span></>} />
        </div>

        <section className="rounded-xl bg-tarjeta p-5">
          <h2 className="mb-3 font-semibold text-marca">ERI mensual</h2>
          <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm">
            <thead className="bg-grafito text-white"><tr><th className="px-2 py-2 text-left font-semibold">Mes</th>{["SKUs contados", "SKUs con diferencia neta", "ERI por SKU", "Unid. ajustadas (bruto)", "Unid. diferencia neta", "% compensado (cruces)", "Faltante S/", "Sobrante S/", "Neto S/"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>{mens.map((x) => { const n = x.falt_s == null ? null : Number(x.sobr_s) - Number(x.falt_s); return (
              <tr key={x.mes} className="border-b border-borde"><td className="px-2 py-1.5 font-semibold">{nomMes(x.mes)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{fmtNum(x.skus)}</td><td className="px-2 py-1.5 text-right tabular-nums">{fmtNum(x.con_dif)}</td>
                <td className={`px-2 py-1.5 text-right font-bold tabular-nums ${tono(x.eri)}`}>{fp(x.eri)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{fmtNum(Number(x.bruto))}</td><td className="px-2 py-1.5 text-right tabular-nums">{fmtNum(Number(x.neta))}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{Number(x.bruto) ? fp(1 - Number(x.neta) / Number(x.bruto)) : "—"}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{soles(x.falt_s)}</td><td className="px-2 py-1.5 text-right tabular-nums">{soles(x.sobr_s)}</td>
                <td className={`px-2 py-1.5 text-right tabular-nums ${n != null && n < 0 ? "text-marca" : ""}`}>{soles(n)}</td></tr>); })}</tbody></table></div>
        </section>

        <section className="rounded-xl bg-tarjeta p-5">
          <h2 className="font-semibold text-marca">ERI por área · mensual y promedio 2026 (de peor a mejor)</h2>
          <p className="mb-3 text-xs text-suave">Por área, la diferencia se netea dentro de la misma área: si el faltante de un área aparece como sobrante en otra, cuenta como error en ambas. Promedio 2026 = promedio simple de los meses con 20 SKUs contados o más.</p>
          <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-grafito text-white"><tr><th className="px-2 py-2 text-left font-semibold">Área</th>{meses.map((m) => <th key={m} className={th}>{nomMes(m)}</th>)}<th className={th}>Promedio 2026</th><th className={th}>SKUs contados (año)</th></tr></thead>
            <tbody>{tabla.map((x) => (
              <tr key={x.a} className="border-b border-borde"><td className="px-2 py-1.5">{x.a}</td>
                {meses.map((m) => { const c = x.porMes.get(m); const v = c ? eriDe(c.skus, c.con_dif) : null; return <td key={m} className={`px-2 py-1.5 text-right tabular-nums ${tono(v)}`}>{v == null ? "" : fp(v)}</td>; })}
                <td className={`px-2 py-1.5 text-right font-bold tabular-nums ${tono(x.prom)}`}>{x.prom == null ? "" : fp(x.prom)}</td><td className="px-2 py-1.5 text-right tabular-nums">{fmtNum(x.skus)}</td></tr>))}
              <tr className="bg-fondo font-bold"><td className="px-2 py-1.5">TOTAL CD (neteo en todo el CD)</td>{meses.map((m) => { const v = mens.find((x) => x.mes === m)?.eri ?? null; return <td key={m} className={`px-2 py-1.5 text-right tabular-nums ${tono(v)}`}>{v == null ? "" : fp(v)}</td>; })}
                <td className={`px-2 py-1.5 text-right tabular-nums ${tono(prom)}`}>{fp(prom)}</td><td className="px-2 py-1.5 text-right tabular-nums">{fmtNum(mens.reduce((a, x) => a + x.skus, 0))}</td></tr>
            </tbody></table></div>
        </section>

        <section className="rounded-xl bg-tarjeta p-5">
          <h2 className="font-semibold text-marca">SKUs con mayor diferencia neta {conCosto ? "en S/" : "(unidades)"} · acumulado del año</h2>
          <p className="mb-3 text-xs text-suave">Para revisar: un SKU con diferencia en muchos meses o con un neto muy alto puede ser un error de registro (unidad vs caja) y no una pérdida real.</p>
          <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-grafito text-white"><tr><th className="px-2 py-2 text-left font-semibold">Cod SKU</th><th className="px-2 py-2 text-left font-semibold">Descripción</th>{["Costo S/", "Meses contado", "Meses con diferencia", "Faltante (un.)", "Sobrante (un.)", "Neto (un.)", "Neto S/"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>{top.map((x) => (
              <tr key={x.cod_alternat} className="border-b border-borde"><td className="px-2 py-1.5">{x.cod_alternat}</td><td className="max-w-72 truncate px-2 py-1.5">{x.descripcion}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{soles(x.costo)}</td><td className="px-2 py-1.5 text-right tabular-nums">{x.meses}</td><td className="px-2 py-1.5 text-right tabular-nums">{x.meses_dif}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{fmtNum(Number(x.faltante))}</td><td className="px-2 py-1.5 text-right tabular-nums">{fmtNum(Number(x.sobrante))}</td>
                <td className={`px-2 py-1.5 text-right tabular-nums ${Number(x.neto) < 0 ? "text-marca" : "text-blue-700"}`}>{fmtNum(Number(x.neto))}</td>
                <td className={`px-2 py-1.5 text-right font-semibold tabular-nums ${Number(x.neto_s) < 0 ? "text-marca" : ""}`}>{soles(x.neto_s)}</td></tr>))}</tbody></table></div>
        </section>
      </>)}
    </div>
  );
}
