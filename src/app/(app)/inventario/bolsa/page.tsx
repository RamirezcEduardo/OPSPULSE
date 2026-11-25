import { createClient } from "@/lib/supabase/server";
import { fmtNum, fmtSoles } from "@/lib/formato";
import { Barras } from "@/components/Graficos";
import { Combo } from "@/components/Lineas";

export const dynamic = "force-dynamic";
type F = { k: string; falt: number | null; sob: number | null; neto: number; movs?: number; d?: string };
type D = {
  kpi: { faltante: number; sobrante: number; neto: number; movs: number; skus: number; sin_costo: number };
  trimestres: { t: string; obj: number; neto: number }[]; mensual: F[] | null; semanal: F[] | null; motivos: F[] | null;
  areas: { k: string; neto: number }[] | null; productos: { k: string; d: string; un: number; neto: number; area: string }[] | null;
  proveedores: { k: string; neto: number; movs: number }[] | null; sin_costo: { k: string; d: string; p: string; movs: number; un: number }[] | null;
  tipo_motivo: { tipo: string; motivo: string; mes: string; neto: number }[] | null; opciones: { meses: string[] | null; semanas: string[] | null };
};
const S = (v: number | null | undefined) => fmtSoles(Number(v ?? 0));
const rojo = (v: number) => (v < 0 ? "text-marca" : "");
const TRIM_ACTUAL = `Q${Math.floor(new Date().getMonth() / 3) + 1}`;

export default async function Bolsa({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const s = await createClient();
  const trim = sp.trim ?? TRIM_ACTUAL;
  const gestion = sp.gestion ?? "CONSIDERAR";
  const { data, error } = await s.rpc("bolsa_dashboard", {
    p_mes: sp.mes || null, p_semana: sp.semana || null, p_tipo: sp.tipo || null, p_gestion: gestion === "Todas" ? null : gestion,
    p_trim: trim === "Todos" ? null : trim, p_dia: sp.dia || null,
  });
  const d = data as D | null;
  const sel = "h-9 rounded-lg border border-borde bg-tarjeta px-2 text-sm text-texto";
  const th = "px-2 py-2 font-semibold";
  if (error || !d) return <p className="rounded-xl bg-tarjeta p-6 text-sm text-marca">{error?.message ?? "Sin datos"}</p>;
  const k = d.kpi;
  const meses = [...new Set((d.tipo_motivo ?? []).map((x) => x.mes))].sort();
  const filasTM = [...new Set((d.tipo_motivo ?? []).map((x) => `${x.tipo}|${x.motivo}`))].sort();
  const totObj = d.trimestres.reduce((a, x) => a + Number(x.obj), 0);
  const totNeto = d.trimestres.reduce((a, x) => a + Number(x.neto), 0);
  const perdida = (n: number) => (n < 0 ? -n : 0);
  const totPerd = d.trimestres.reduce((a, x) => a + perdida(Number(x.neto)), 0);
  const estado = (pct: number) => (pct >= 1 ? ["EXCEDIDO · sobre la tolerancia", "bg-red-200 text-red-900"] : pct >= 0.8 ? ["ALERTA · cerca del límite", "bg-amber-200 text-amber-900"] : ["OK · dentro de tolerancia", "bg-green-100 text-green-800"]);

  return (
    <div className="flex flex-col gap-5">
      <header className="rounded-xl bg-grafito p-5 text-white">
        <h1 className="text-2xl font-extrabold">CONTROL DE BOLSA {new Date().getFullYear()} · CD11</h1>
        <p className="text-xs text-white/70">Ajustes valorizados · conteo cíclico (cód. 19, 17), ajustes LPN (cód. 19 en XX-, 29, 52) y shortpick (cód. 4, 17)</p>
      </header>
      <form className="flex flex-wrap items-end gap-2 rounded-xl bg-tarjeta p-3">
        {[["mes", "Mes", ["", ...(d.opciones.meses ?? [])], "Todos"], ["semana", "Semana", ["", ...(d.opciones.semanas ?? [])], "Todas"], ["tipo", "Tipo", ["", "CONTEO CICLICO", "AJUSTE LPN"], "Todos"],
          ["gestion", "Gestión", ["CONSIDERAR", "NO CONSIDERAR", "Todas"], null], ["trim", "Trimestre", ["Todos", "Q1", "Q2", "Q3", "Q4"], null]].map(([n, l, ops, vacio]) => (
          <label key={n as string} className="flex flex-col gap-1 text-xs text-suave">{l as string}
            <select name={n as string} defaultValue={n === "trim" ? trim : n === "gestion" ? gestion : sp[n as string] ?? ""} className={sel}>
              {(ops as string[]).map((o) => <option key={o} value={o}>{o || (vacio as string)}</option>)}</select></label>))}
        <label className="flex flex-col gap-1 text-xs text-suave">Día<input type="date" name="dia" defaultValue={sp.dia ?? ""} className={sel} /></label>
        <button className="h-9 rounded-lg bg-marca px-4 text-sm font-semibold text-white">Ver</button>
      </form>

      <section className="grid grid-cols-2 overflow-hidden rounded-xl bg-tarjeta sm:grid-cols-3 xl:grid-cols-6">
        {[["Faltante S/", S(k.faltante), "text-marca"], ["Sobrante S/", S(k.sobrante), ""], ["Neto S/", S(k.neto), rojo(k.neto)], ["Movimientos", fmtNum(k.movs), ""], ["SKUs", fmtNum(k.skus), ""], ["SKUs sin costo", fmtNum(k.sin_costo), k.sin_costo ? "text-marca" : ""]].map(([t, v, c]) => (
          <div key={t} className="text-center"><p className="bg-marca py-1 text-xs font-semibold text-white">{t}</p><p className={`px-1 py-3 text-lg font-bold tabular-nums sm:text-2xl ${c}`}>{v}</p></div>))}
      </section>

      <section className="rounded-xl bg-tarjeta p-5">
        <h2 className="mb-3 font-semibold text-marca">Tolerancia por trimestre (Obj MD)</h2>
        <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-sm">
          <thead className="bg-grafito text-white"><tr>{["Trimestre", "Obj MD S/ (tolerancia)", "MD real S/ (bolsa)", "Pérdida a cubrir S/", "Gabela S/", "% tolerancia usado", "Estado actual"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>{d.trimestres.map((x) => { const p = perdida(Number(x.neto)), pct = x.obj ? p / Number(x.obj) : 0, [e, c] = estado(pct);
            return <tr key={x.t} className="border-b border-borde text-center"><td className="px-2 py-1.5 text-left font-semibold">{x.t} {x.t === TRIM_ACTUAL ? "(en curso)" : x.t < TRIM_ACTUAL ? "(cerrado)" : ""}</td>
              <td className="bg-amber-50 px-2 py-1.5 tabular-nums dark:bg-amber-950/30">{S(x.obj)}</td><td className={`px-2 py-1.5 tabular-nums ${rojo(Number(x.neto))}`}>{S(x.neto)}</td>
              <td className="px-2 py-1.5 tabular-nums">{S(p)}</td><td className="px-2 py-1.5 font-semibold tabular-nums text-green-700">{S(Number(x.obj) - p)}</td>
              <td className={`px-2 py-1.5 tabular-nums ${pct >= 0.8 ? "bg-red-200 text-red-900" : "bg-green-100 text-green-800"}`}>{(pct * 100).toFixed(1)}%</td>
              <td className={`px-2 py-1.5 font-semibold ${c}`}>{e}</td></tr>; })}
            <tr className="bg-fondo text-center font-bold"><td className="px-2 py-1.5 text-left">TOTAL AÑO</td><td className="px-2 py-1.5">{S(totObj)}</td><td className={`px-2 py-1.5 ${rojo(totNeto)}`}>{S(totNeto)}</td><td className="px-2 py-1.5">{S(totPerd)}</td><td className="px-2 py-1.5">{S(totObj - totPerd)}</td><td className="px-2 py-1.5">{totObj ? ((totPerd / totObj) * 100).toFixed(1) : 0}%</td><td className="px-2 py-1.5">Gabela acumulada: {S(totObj - totPerd)}</td></tr>
          </tbody></table></div>
        <p className="mt-2 text-xs text-suave">El MD real por trimestre usa Gestión = CONSIDERAR, sin importar los filtros de arriba. Objetivos en Configuración → parámetro «bolsa_obj_md».</p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Combo titulo="Evolutivo mensual (S/)" datos={(d.mensual ?? []).map((x) => ({ x: x.k, falt: Number(x.falt ?? 0), sob: Number(x.sob ?? 0), neto: Number(x.neto) }))} />
        <Barras titulo="Neto por motivo (S/)" datos={(d.motivos ?? []).map((x) => [x.k, Number(x.neto)] as [string, number])} fmt={(n) => S(n)} color={(v) => (v < 0 ? "bg-red-600" : "bg-red-600/80")} />
        <Combo titulo="Evolutivo semanal (S/)" datos={(d.semanal ?? []).map((x) => ({ x: x.k, falt: Number(x.falt ?? 0), sob: Number(x.sob ?? 0), neto: Number(x.neto) }))} />
        <Barras titulo="Neto por área (S/)" datos={(d.areas ?? []).map((x) => [x.k, Number(x.neto)] as [string, number])} fmt={(n) => S(n)} color={() => "bg-grafito"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl bg-tarjeta p-5">
          <h2 className="mb-3 font-semibold text-marca">Top 15 productos con mayor pérdida NETA <span className="text-xs font-normal text-suave">(neteado entre ubicaciones · Área = donde se perdió)</span></h2>
          <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm">
            <thead className="bg-grafito text-left text-white"><tr><th className={th}>Cod Alternat</th><th className={th}>Descripción</th><th className={th}>Área</th><th className={`${th} text-right`}>Unidades</th><th className={`${th} text-right`}>Neto S/</th></tr></thead>
            <tbody>{(d.productos ?? []).map((x) => <tr key={x.k} className="border-b border-borde"><td className="px-2 py-1">{x.k}</td><td className="max-w-64 truncate px-2 py-1">{x.d}</td><td className="px-2 py-1">{x.area}</td><td className="px-2 py-1 text-right tabular-nums">{fmtNum(Number(x.un))}</td><td className="px-2 py-1 text-right tabular-nums text-marca">{S(x.neto)}</td></tr>)}</tbody></table></div>
        </section>
        <section className="rounded-xl bg-tarjeta p-5">
          <h2 className="mb-3 font-semibold text-marca">Top 10 proveedores con mayor pérdida</h2>
          <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-sm">
            <thead className="bg-grafito text-left text-white"><tr><th className={th}>Proveedor</th><th className={`${th} text-right`}>Neto S/</th><th className={`${th} text-right`}>Movimientos</th></tr></thead>
            <tbody>{(d.proveedores ?? []).map((x) => <tr key={x.k} className="border-b border-borde"><td className="px-2 py-1">{x.k}</td><td className="px-2 py-1 text-right tabular-nums text-marca">{S(x.neto)}</td><td className="px-2 py-1 text-right tabular-nums">{fmtNum(x.movs)}</td></tr>)}</tbody></table></div>
        </section>
        <section className="rounded-xl bg-tarjeta p-5">
          <h2 className="mb-3 font-semibold text-marca">Cod Alternat sin valor unitario <span className="text-xs font-normal text-suave">(cargar costo)</span></h2>
          <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm">
            <thead className="bg-grafito text-left text-white"><tr><th className={th}>Cod Alternat</th><th className={th}>Descripción</th><th className={th}>Proveedor</th><th className={`${th} text-right`}>Movimientos</th><th className={`${th} text-right`}>Unidades</th></tr></thead>
            <tbody>{(d.sin_costo ?? []).map((x) => <tr key={x.k} className="border-b border-borde"><td className="px-2 py-1">{x.k}</td><td className="max-w-64 truncate px-2 py-1">{x.d}</td><td className="px-2 py-1">{x.p}</td><td className="px-2 py-1 text-right">{x.movs}</td><td className="px-2 py-1 text-right">{fmtNum(Number(x.un))}</td></tr>)}</tbody></table></div>
        </section>
        <section className="rounded-xl bg-tarjeta p-5">
          <h2 className="mb-3 font-semibold text-marca">Detalle por motivo</h2>
          <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm">
            <thead className="bg-grafito text-left text-white"><tr><th className={th}>Motivo</th><th className={`${th} text-right`}>Faltante S/</th><th className={`${th} text-right`}>Sobrante S/</th><th className={`${th} text-right`}>Neto S/</th><th className={`${th} text-right`}>Movimientos</th></tr></thead>
            <tbody>{(d.motivos ?? []).map((x) => <tr key={x.k} className="border-b border-borde"><td className="px-2 py-1">{x.k}</td><td className="px-2 py-1 text-right tabular-nums text-marca">{S(x.falt)}</td><td className="px-2 py-1 text-right tabular-nums">{S(x.sob)}</td><td className={`px-2 py-1 text-right tabular-nums ${rojo(Number(x.neto))}`}>{S(x.neto)}</td><td className="px-2 py-1 text-right">{fmtNum(x.movs ?? 0)}</td></tr>)}</tbody></table></div>
        </section>
      </div>

      <section className="rounded-xl bg-tarjeta p-5">
        <h2 className="mb-3 font-semibold text-marca">Bolsa por tipo y motivo · por mes (mismo formato del cierre)</h2>
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
          <thead className="bg-grafito text-white"><tr><th className={`${th} text-left`}>Tipo</th><th className={`${th} text-left`}>Motivo</th>{meses.map((m) => <th key={m} className={`${th} text-right`}>{m}</th>)}</tr></thead>
          <tbody>{filasTM.map((f) => { const [t, mo] = f.split("|"); return (
            <tr key={f} className="border-b border-borde"><td className="px-2 py-1">{t}</td><td className="px-2 py-1">{mo}</td>
              {meses.map((m) => { const v = (d.tipo_motivo ?? []).find((x) => x.tipo === t && x.motivo === mo && x.mes === m)?.neto; return <td key={m} className={`px-2 py-1 text-right tabular-nums ${rojo(Number(v ?? 0))}`}>{v == null ? "" : S(v)}</td>; })}</tr>); })}</tbody></table></div>
      </section>
    </div>
  );
}
