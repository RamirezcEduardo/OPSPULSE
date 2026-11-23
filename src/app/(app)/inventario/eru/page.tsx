import Link from "next/link";
import { obtenerPermisos } from "@/lib/permisos";
import { fmtNum } from "@/lib/formato";
import { Kpis } from "@/components/Graficos";
import { Lineas } from "@/components/Lineas";
import { CargarEru } from "./CargarEru";
import { eriMensual, eruMensual, fp, nomMes } from "./datos";

export const dynamic = "force-dynamic";
const color = (x: number, verde: number, rojo: number) => (x >= verde ? "text-green-700 dark:text-green-400" : x < rojo ? "text-marca" : "text-amber-600");

export default async function Resumen() {
  const { nivel } = await obtenerPermisos();
  const [eru, eri] = await Promise.all([eruMensual(), eriMensual()]);
  const ult = eru.meses.at(-1), ulti = eri.at(-1), anti = eri.at(-2);
  const prom = eri.filter((x) => x.skus >= 20);
  const eriProm = prom.length ? prom.reduce((a, x) => a + x.eri, 0) / prom.length : 0;
  const meses = [...new Set([...eru.meses.map((x) => x.mes), ...eri.map((x) => x.mes)])].sort();
  const datos = meses.map((m) => ({ x: nomMes(m), ERU: eru.meses.find((x) => x.mes === m) ? Math.round(eru.meses.find((x) => x.mes === m)!.eru * 1000) / 10 : null, ERI: eri.find((x) => x.mes === m) ? Math.round(eri.find((x) => x.mes === m)!.eri * 1000) / 10 : null }));
  const tarjeta = "flex flex-col gap-3 rounded-xl bg-tarjeta p-5 hover:ring-2 hover:ring-marca";
  return (
    <div className="flex flex-col gap-5">
      <header><p className="text-sm text-suave">Control de inventario</p><h1 className="text-2xl font-extrabold">ERU / ERI · Resumen 2026</h1></header>
      {nivel("/cargas") === "editar" && <CargarEru cargados={eru.meses.map((x) => x.mes)} />}
      {!meses.length ? <p className="rounded-xl bg-tarjeta p-6 text-sm text-suave">Aún no hay meses cargados.</p> : (<>
        <div className="grid gap-4 lg:grid-cols-2">
          <Link href="/inventario/eru/eru" className={tarjeta}>
            <div className="flex items-center justify-between"><h2 className="font-bold">ERU · Exactitud de ubicaciones</h2><span className="text-sm text-marca">Ver detalle →</span></div>
            <p className="text-xs text-suave">1 − ubicaciones con error ÷ ubicaciones contadas</p>
            <div className="grid grid-cols-3 gap-2">
              <div><p className="text-xs text-suave">ERU 2026</p><p className={`text-2xl font-bold ${color(eru.contadas ? 1 - eru.con_error / eru.contadas : 0, 0.98, 0.95)}`}>{fp(eru.contadas ? 1 - eru.con_error / eru.contadas : 0)}</p></div>
              <div><p className="text-xs text-suave">ERU {ult ? nomMes(ult.mes) : ""}</p><p className={`text-2xl font-bold ${ult ? color(ult.eru, 0.98, 0.95) : ""}`}>{ult ? fp(ult.eru) : "—"}</p></div>
              <div><p className="text-xs text-suave">Ubicaciones contadas</p><p className="text-2xl font-bold">{fmtNum(eru.contadas)}</p></div>
            </div>
          </Link>
          <Link href="/inventario/eru/eri" className={tarjeta}>
            <div className="flex items-center justify-between"><h2 className="font-bold">ERI · Exactitud por SKU</h2><span className="text-sm text-marca">Ver detalle →</span></div>
            <p className="text-xs text-suave">SKUs contados sin diferencia neta ÷ SKUs contados</p>
            <div className="grid grid-cols-3 gap-2">
              <div><p className="text-xs text-suave">ERI promedio 2026</p><p className={`text-2xl font-bold ${color(eriProm, 0.95, 0.85)}`}>{fp(eriProm)}</p></div>
              <div><p className="text-xs text-suave">ERI {ulti ? nomMes(ulti.mes) : ""}</p><p className={`text-2xl font-bold ${ulti ? color(ulti.eri, 0.95, 0.85) : ""}`}>{ulti ? fp(ulti.eri) : "—"}</p>
                {anti && ulti && <p className="text-xs text-suave">{nomMes(anti.mes)}: {fp(anti.eri)}</p>}</div>
              <div><p className="text-xs text-suave">SKUs con diferencia {ulti ? nomMes(ulti.mes) : ""}</p><p className="text-2xl font-bold">{ulti ? fmtNum(ulti.con_dif) : "—"}</p></div>
            </div>
          </Link>
        </div>
        <Lineas titulo="ERU y ERI por mes" etiquetas series={["ERU", "ERI"]} datos={datos} />
        <Kpis items={meses.slice(-6).map((m) => { const a = eru.meses.find((x) => x.mes === m), b = eri.find((x) => x.mes === m);
          return { t: nomMes(m) + " " + m.slice(0, 4), v: `${a ? fp(a.eru) : "—"} / ${b ? fp(b.eri) : "—"}`, s: "ERU / ERI" }; })} />
      </>)}
    </div>
  );
}
