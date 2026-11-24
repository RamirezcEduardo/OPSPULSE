import { createClient } from "@/lib/supabase/server";
import { fmtFecha, fmtNum, fmtSoles } from "@/lib/formato";

export const dynamic = "force-dynamic";
type N = { cod_alternat: string; descripcion: string; fecha_neg: string; fecha_min: string; perdida_max: number; und_min: number; fecha_mayor_pos: string; fecha_ult_pos: string; recuperado: number; saldo: number; saldo_und: number; estado: string };
const f = (d: string | null) => (d ? fmtFecha(d + "T12:00:00-05:00") : "—");

export default async function Neteos({ searchParams }: { searchParams: Promise<{ trim?: string }> }) {
  const sp = await searchParams;
  const trim = sp.trim ?? `Q${Math.floor(new Date().getMonth() / 3) + 1}`;
  const s = await createClient();
  const { data, error } = await s.rpc("bolsa_neteos", { p_trim: trim });
  const r = (data ?? []) as N[];
  const total = r.filter((x) => x.estado === "NETEADO TOTAL").length;
  const rec = r.reduce((a, x) => a + Number(x.recuperado), 0);
  const pend = r.filter((x) => x.estado === "PARCIAL").reduce((a, x) => a + Number(x.saldo), 0);
  const th = "px-2 py-2 font-semibold";
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold text-marca">NETEOS {trim} · SKUs que estuvieron en negativo y se recuperaron con un ajuste positivo</h1>
          <p className="text-xs text-suave">Gestión CONSIDERAR, sin ajustes manuales del auditor · Neto acumulado por SKU día a día: cuándo quedó en negativo, su pérdida máxima y el ajuste positivo que lo recuperó.</p></div>
        <form className="flex items-end gap-2"><label className="flex flex-col gap-1 text-xs text-suave">Trimestre
          <select name="trim" defaultValue={trim} className="h-9 rounded-lg border border-borde bg-tarjeta px-2 text-sm text-texto">{["Q1", "Q2", "Q3", "Q4"].map((q) => <option key={q}>{q}</option>)}</select></label>
          <button className="h-9 rounded-lg bg-marca px-4 text-sm font-semibold text-white">Ver</button></form>
      </header>
      {error && <p className="text-sm text-marca">{error.message}</p>}
      <p className="text-lg font-bold text-green-700 dark:text-green-400">SKUs recuperados: {fmtNum(r.length)} · Neteado total: {fmtNum(total)} · Parcial: {fmtNum(r.length - total)} · S/ recuperado: {fmtNum(rec)} · Saldo pendiente en parciales: {fmtNum(-pend)}</p>
      <section className="rounded-xl bg-tarjeta p-3">
        <div className="max-h-[70vh] overflow-auto"><table className="w-full min-w-[1200px] text-sm">
          <thead className="sticky top-0 bg-grafito text-white"><tr>{["Cod", "Descripción", "Fecha quedó en negativo", "Fecha pérdida máxima", "Pérdida máxima S/", "Und en pérdida máx", "Fecha mayor ajuste positivo", "Fecha último positivo", "Recuperado S/", "Saldo actual S/", "Saldo und", "Estado"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>{r.map((x) => (
            <tr key={x.cod_alternat} className="border-b border-borde">
              <td className="px-2 py-1">{x.cod_alternat}</td><td className="max-w-64 truncate px-2 py-1">{x.descripcion}</td>
              <td className="px-2 py-1 text-center">{f(x.fecha_neg)}</td><td className="px-2 py-1 text-center">{f(x.fecha_min)}</td>
              <td className="px-2 py-1 text-right tabular-nums text-marca">{fmtSoles(Number(x.perdida_max))}</td><td className="px-2 py-1 text-right tabular-nums">{fmtNum(Number(x.und_min))}</td>
              <td className="px-2 py-1 text-center">{f(x.fecha_mayor_pos)}</td><td className="px-2 py-1 text-center">{f(x.fecha_ult_pos)}</td>
              <td className="px-2 py-1 text-right font-semibold tabular-nums text-green-700">{fmtSoles(Number(x.recuperado))}</td>
              <td className={`px-2 py-1 text-right tabular-nums ${Number(x.saldo) < 0 ? "text-marca" : ""}`}>{fmtSoles(Number(x.saldo))}</td><td className="px-2 py-1 text-right tabular-nums">{fmtNum(Number(x.saldo_und))}</td>
              <td className={`px-2 py-1 font-bold ${x.estado === "PARCIAL" ? "bg-amber-200 text-amber-900" : "bg-green-100 text-green-800"}`}>{x.estado}</td></tr>))}</tbody></table></div>
      </section>
    </div>
  );
}
