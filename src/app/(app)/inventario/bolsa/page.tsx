import { createClient } from "@/lib/supabase/server";
import { fmtNum, fmtSoles } from "@/lib/formato";
import { CIERRES_OFICIALES } from "@/lib/reglas/valorizacion";

export const dynamic = "force-dynamic";

export default async function BolsaPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_ajuste")
    .select("valor, cod_alternat, sin_costo")
    .eq("gestion", "CONSIDERAR")
    .limit(100000);

  const filas = data ?? [];
  const faltante = filas.reduce((s, f) => s + (f.valor < 0 ? Number(f.valor) : 0), 0);
  const sobrante = filas.reduce((s, f) => s + (f.valor > 0 ? Number(f.valor) : 0), 0);
  const skus = new Set(filas.map((f) => f.cod_alternat)).size;
  const sinCosto = new Set(filas.filter((f) => f.sin_costo).map((f) => f.cod_alternat)).size;

  const kpis = [
    { t: "Faltante", v: fmtSoles(faltante), c: "text-marca-oscuro" },
    { t: "Sobrante", v: fmtSoles(sobrante), c: "text-blue-700" },
    { t: "Neto", v: fmtSoles(faltante + sobrante), c: "" },
    { t: "Movimientos", v: fmtNum(filas.length), c: "" },
    { t: "SKUs", v: fmtNum(skus), c: "" },
    { t: "SKUs sin costo", v: fmtNum(sinCosto), c: "" },
  ];
  const maxCierre = Math.max(...Object.values(CIERRES_OFICIALES).map(Math.abs));

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-extrabold">Bolsa de inventario</h1>
        <p className="text-sm text-suave">CD11 · gestión CONSIDERAR</p>
      </header>
      {error && (
        <p role="alert" className="rounded-lg bg-tarjeta p-4 text-sm text-marca-oscuro">
          No se pudo leer la base: {error.message}. ¿Ya se aplicó la migración inicial?
        </p>
      )}
      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <div key={k.t} className="rounded-xl bg-tarjeta p-4">
            <p className="text-xs text-suave">{k.t}</p>
            <p className={`mt-1.5 text-xl font-bold whitespace-nowrap ${k.c}`}>{k.v}</p>
          </div>
        ))}
      </section>
      <section className="rounded-xl bg-tarjeta p-5">
        <h2 className="mb-4 font-semibold">Cierres trimestrales oficiales</h2>
        <div className="flex flex-col gap-3">
          {Object.entries(CIERRES_OFICIALES).map(([q, v]) => (
            <div key={q} className="flex items-center gap-3 text-sm">
              <span className="w-7 font-semibold">{q}</span>
              <div className="h-5 rounded bg-marca" style={{ width: `${(Math.abs(v) / maxCierre) * 70}%` }} />
              <span>{fmtSoles(v)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
