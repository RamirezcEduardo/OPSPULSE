import Link from "next/link";
import { fmtNum } from "@/lib/formato";

export function Barras({ titulo, datos, fmt = fmtNum, color, max: maxFijo, leyenda, enlace, extra }: { titulo: string; datos: [string, number][]; fmt?: (n: number) => string; color?: (v: number) => string; max?: number; leyenda?: React.ReactNode; enlace?: (k: string) => string; extra?: (k: string) => React.ReactNode }) {
  const max = maxFijo ?? Math.max(1, ...datos.map(([, v]) => Math.abs(v)));
  return (
    <section className="rounded-xl bg-tarjeta p-5">
      <h2 className="mb-4 font-semibold">{titulo}</h2>
      {!datos.length ? <p className="text-sm text-suave">Sin datos.</p> : (
        <ul className="flex flex-col gap-2.5">{datos.map(([k, v]) => (
          <li key={k} title={`${k}: ${fmt(v)}`} className="grid grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-3 text-sm">
            {enlace ? <Link href={enlace(k)} className="truncate text-marca underline-offset-2 hover:underline">{k}</Link> : <span className="truncate text-suave">{k}</span>}
            <span className={`h-3.5 rounded-r ${color ? color(v) : "bg-texto/70 hover:bg-marca"}`} style={{ width: `${(Math.abs(v) / max) * 100}%` }} />
            <span className="whitespace-nowrap tabular-nums">{fmt(v)}{extra?.(k)}</span>
          </li>))}</ul>)}
      {leyenda && <div className="mt-3 flex flex-wrap gap-3 text-xs text-suave">{leyenda}</div>}
    </section>
  );
}

export function Kpis({ items }: { items: { t: string; v: React.ReactNode; s?: string; alerta?: boolean }[] }) {
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {items.map((k) => (
        <div key={k.t} className="rounded-xl bg-tarjeta p-4">
          <p className="text-xs text-suave">{k.t}</p>
          <p className={`mt-1.5 whitespace-nowrap text-xl font-bold ${k.alerta ? "text-marca" : ""}`}>{k.v}</p>
          {k.s && <p className="text-xs text-suave">{k.s}</p>}
        </div>))}
    </section>
  );
}

export const agrupar = <T,>(xs: T[], k: (x: T) => string | null, v: (x: T) => number = () => 1) => {
  const m = new Map<string, number>();
  xs.forEach((x) => { const key = k(x) || "Sin dato"; m.set(key, (m.get(key) ?? 0) + v(x)); });
  return [...m].sort((a, b) => b[1] - a[1]);
};
