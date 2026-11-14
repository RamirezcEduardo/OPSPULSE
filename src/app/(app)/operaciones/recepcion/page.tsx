import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fmtFecha, fmtNum } from "@/lib/formato";
import { CargarASN } from "./Cargar";

export const dynamic = "force-dynamic";

type A = {
  nro_asn: string; estado: string; tipo_asn: string | null; proveedor: string | null; nro_carga: string | null; placa: string | null;
  lpn_enviadas: number; lpn_recibidas: number; un_enviadas: number; un_recibidas: number; pct_recepcion: number;
  dif_unidades: number; dif_lpn: number; resultado: string; min_creacion_a_recepcion: number | null; min_recepcion: number | null;
  min_hasta_verificar: number | null; horas_pendiente: number | null; dia: string; turno: string | null; usuario_modif: string | null;
  estado_gestion: string | null; causa: string | null;
};

const RES: Record<string, { c: string; i: string }> = {
  CONFORME: { c: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300", i: "✓" },
  "CON DIFERENCIA": { c: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300", i: "!" },
  "LPN CONSOLIDADO": { c: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300", i: "i" },
  PENDIENTE: { c: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300", i: "…" },
};
const mediana = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x != null).sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : null;
};
const hm = (m: number | null) => (m == null ? "—" : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`);

function Barras({ titulo, datos, fmt = fmtNum }: { titulo: string; datos: [string, number][]; fmt?: (n: number) => string }) {
  const max = Math.max(1, ...datos.map(([, v]) => Math.abs(v)));
  return (
    <section className="rounded-xl bg-tarjeta p-5">
      <h2 className="mb-4 font-semibold">{titulo}</h2>
      {datos.length === 0 ? <p className="text-sm text-suave">Sin datos.</p> : (
        <ul className="flex flex-col gap-2.5">
          {datos.map(([k, v]) => (
            <li key={k} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm" title={`${k}: ${fmt(v)}`}>
              <span className="truncate text-suave">{k}</span>
              <span className="h-3.5 rounded-r bg-texto/70 hover:bg-marca" style={{ width: `${(Math.abs(v) / max) * 100}%` }} />
              <span className="tabular-nums">{fmt(v)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function RecepcionPage({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const { dia: diaParam } = await searchParams;
  const supabase = await createClient();
  const { data: dias } = await supabase.from("v_asn").select("dia").order("dia", { ascending: false }).limit(2000);
  const listaDias = [...new Set((dias ?? []).map((d) => d.dia as string))];
  const dia = diaParam && listaDias.includes(diaParam) ? diaParam : listaDias[0];
  const { data: cl } = await supabase.auth.getClaims();
  const { data: perfil } = await supabase.from("perfil").select("rol").eq("id", cl?.claims?.sub ?? "").maybeSingle();
  const esAdmin = perfil?.rol === "admin";

  const { data, error } = dia
    ? await supabase.from("v_asn").select("*").eq("dia", dia).limit(5000)
    : { data: [] as A[], error: null };
  const asn = (data ?? []) as A[];

  const tot = asn.length;
  const verif = asn.filter((a) => a.estado === "Verificado").length;
  const conDif = asn.filter((a) => a.resultado === "CON DIFERENCIA");
  const pend = asn.filter((a) => a.resultado === "PENDIENTE");
  const unEnv = asn.reduce((s, a) => s + Number(a.un_enviadas ?? 0), 0);
  const unRec = asn.reduce((s, a) => s + Number(a.un_recibidas ?? 0), 0);
  const faltante = conDif.reduce((s, a) => s + Math.min(0, Number(a.dif_unidades)), 0);
  const sobrante = conDif.reduce((s, a) => s + Math.max(0, Number(a.dif_unidades)), 0);

  const agrupar = (key: (a: A) => string | null) => {
    const m = new Map<string, number>();
    asn.forEach((a) => { const k = key(a) ?? "Sin dato"; m.set(k, (m.get(k) ?? 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const porResultado = agrupar((a) => a.resultado);
  const porTipo = agrupar((a) => a.tipo_asn);
  const porTurno = agrupar((a) => a.turno);
  const porProveedor = agrupar((a) => a.proveedor).slice(0, 10);
  const porUsuario = agrupar((a) => a.usuario_modif).slice(0, 10);

  const kpis = [
    { t: "ASN del día", v: fmtNum(tot) },
    { t: "Verificadas", v: tot ? `${((verif / tot) * 100).toFixed(1)}%` : "—", s: `${fmtNum(verif)} de ${fmtNum(tot)}` },
    { t: "Pendientes", v: fmtNum(pend.length), alerta: pend.length > 0 },
    { t: "Con diferencia", v: fmtNum(conDif.length), alerta: conDif.length > 0 },
    { t: "Unidades recibidas", v: fmtNum(unRec), s: `de ${fmtNum(unEnv)} enviadas` },
    { t: "Faltante / sobrante", v: `${fmtNum(faltante)} / +${fmtNum(sobrante)}`, s: "unidades", alerta: faltante < 0 },
  ];
  const tiempos = [
    { t: "Creación → 1.ª LPN recibida", v: hm(mediana(asn.map((a) => a.min_creacion_a_recepcion))) },
    { t: "Recepción (1.ª → última LPN)", v: hm(mediana(asn.map((a) => a.min_recepcion))) },
    { t: "Última LPN → verificación", v: hm(mediana(asn.map((a) => a.min_hasta_verificar))) },
  ];
  const atencion = [...conDif.sort((a, b) => Number(a.dif_unidades) - Number(b.dif_unidades)), ...pend];

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-suave">Seguimiento de operaciones</p>
          <h1 className="text-2xl font-extrabold">Auditoría de recepción</h1>
        </div>
        {listaDias.length > 0 && (
          <form className="flex items-end gap-2">
            <label className="flex flex-col gap-1 text-xs text-suave">Día
              <select name="dia" defaultValue={dia} className="h-10 rounded-lg border border-borde bg-tarjeta px-2 text-sm text-texto">
                {listaDias.map((d) => <option key={d} value={d}>{fmtFecha(d + "T12:00:00-05:00")}</option>)}
              </select>
            </label>
            <button className="h-10 rounded-lg border border-borde bg-tarjeta px-3 text-sm">Ver</button>
          </form>
        )}
      </header>

      {esAdmin && <CargarASN />}
      {error && <p role="alert" className="rounded-xl bg-tarjeta p-4 text-sm text-marca-oscuro">{error.message}</p>}

      {tot === 0 ? (
        <p className="rounded-xl bg-tarjeta p-6 text-sm text-suave">Aún no hay ASN cargadas. Sube el export del WMS para ver el dashboard.</p>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {kpis.map((k) => (
              <div key={k.t} className="rounded-xl bg-tarjeta p-4">
                <p className="text-xs text-suave">{k.t}</p>
                <p className={`mt-1.5 whitespace-nowrap text-xl font-bold ${k.alerta ? "text-marca" : ""}`}>{k.v}</p>
                {k.s && <p className="text-xs text-suave">{k.s}</p>}
              </div>
            ))}
          </section>

          <section className="rounded-xl bg-tarjeta p-5">
            <h2 className="mb-3 font-semibold">ASN que requieren atención</h2>
            {atencion.length === 0 ? (
              <p className="text-sm text-suave">✓ Todas las ASN del día están verificadas y sin diferencias.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead className="text-left text-suave">
                    <tr>{["Resultado", "ASN", "Tipo", "Proveedor", "Placa", "LPN env/rec", "Und env", "Und rec", "Diferencia", "%", "Gestión"].map((h) => (
                      <th key={h} className="border-b border-borde px-2 py-2 font-medium">{h}</th>))}</tr>
                  </thead>
                  <tbody>
                    {atencion.map((a) => (
                      <tr key={a.nro_asn} className="border-b border-borde">
                        <td className="px-2 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${RES[a.resultado]?.c}`}>{RES[a.resultado]?.i} {a.resultado}</span></td>
                        <td className="px-2 py-2 font-mono text-xs">{a.nro_asn}</td>
                        <td className="px-2 py-2">{a.tipo_asn}</td>
                        <td className="px-2 py-2">{a.proveedor ?? "—"}</td>
                        <td className="px-2 py-2">{a.placa ?? "—"}</td>
                        <td className="px-2 py-2 tabular-nums">{a.lpn_enviadas} / {a.lpn_recibidas}</td>
                        <td className="px-2 py-2 tabular-nums">{fmtNum(a.un_enviadas)}</td>
                        <td className="px-2 py-2 tabular-nums">{fmtNum(a.un_recibidas)}</td>
                        <td className={`px-2 py-2 font-semibold tabular-nums ${Number(a.dif_unidades) < 0 ? "text-marca" : ""}`}>{a.resultado === "PENDIENTE" ? `${a.horas_pendiente ?? "—"} h pend.` : fmtNum(a.dif_unidades)}</td>
                        <td className="px-2 py-2 tabular-nums">{a.pct_recepcion ?? "—"}%</td>
                        <td className="px-2 py-2">{a.estado_gestion ?? "ABIERTA"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {tiempos.map((t) => (
              <div key={t.t} className="rounded-xl bg-tarjeta p-4">
                <p className="text-xs text-suave">{t.t} <span className="opacity-70">(mediana)</span></p>
                <p className="mt-1.5 text-xl font-bold">{t.v}</p>
              </div>
            ))}
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Barras titulo="ASN por resultado" datos={porResultado} />
            <Barras titulo="ASN por tipo" datos={porTipo} />
            <Barras titulo="Top 10 proveedores / origen (ASN)" datos={porProveedor} />
            <Barras titulo="ASN por turno de recepción" datos={porTurno} />
            <Barras titulo="Verificadas por usuario" datos={porUsuario} />
          </div>
          <p className="text-xs text-suave">Fuente: export WMS › ASN · <Link href="/cargas" className="underline">historial de cargas</Link></p>
        </>
      )}
    </div>
  );
}
