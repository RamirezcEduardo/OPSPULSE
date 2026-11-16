import { fmtNum } from "@/lib/formato";

export function Barras({ titulo, datos, fmt = fmtNum }: { titulo: string; datos: [string, number][]; fmt?: (n: number) => string }) {
  const max = Math.max(1, ...datos.map(([, v]) => Math.abs(v)));
  return (
    <section className="rounded-xl bg-tarjeta p-5">
      <h2 className="mb-4 font-semibold">{titulo}</h2>
      {!datos.length ? <p className="text-sm text-suave">Sin datos.</p> : (
        <ul className="flex flex-col gap-2.5">{datos.map(([k, v]) => (
          <li key={k} title={`${k}: ${fmt(v)}`} className="grid grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-3 text-sm">
            <span className="truncate text-suave">{k}</span>
            <span className="h-3.5 rounded-r bg-texto/70 hover:bg-marca" style={{ width: `${(Math.abs(v) / max) * 100}%` }} />
            <span className="tabular-nums">{fmt(v)}</span>
          </li>))}</ul>)}
    </section>
  );
}

export function Kpis({ items }: { items: { t: string; v: string; s?: string; alerta?: boolean }[] }) {
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
