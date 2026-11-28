import Link from "next/link";

type P = { k: string; a?: string; pos: number; oc: number };
const pct = (p: P) => (p.pos ? (p.oc / p.pos) * 100 : 0);
const fondo = (v: number) => (v >= 85 ? "#dc2626" : v >= 70 ? "#f59e0b" : "#16a34a");

/** Mapa de planta: cada área es un bloque; cada pasillo, un tile vertical entre racks, en orden desde la pared (01). Pintado por UCA con los filtros activos. */
export function Planta({ pasillos, sp }: { pasillos: P[]; sp: Record<string, string | undefined> }) {
  const areas = [...new Set(pasillos.map((x) => x.a ?? ""))].sort();
  const href = (k: string) => {
    const q = Object.fromEntries(Object.entries(sp).filter(([kk, v]) => v && kk !== "bahia" && kk !== "pasillo") as [string, string][]);
    if (sp.pasillo !== k) q.pasillo = k;
    return `?${new URLSearchParams(q)}#rack`;
  };
  return (
    <section className="rounded-xl bg-tarjeta p-5">
      <h2 className="font-semibold text-marca">Mapa de planta · vista desde arriba</h2>
      <p className="mb-3 text-xs text-suave">Cada columna es un pasillo con sus racks a los lados, en orden desde la pared. El color es la UCA con los filtros de arriba (altura, nivel). Toca un pasillo para verlo de frente.</p>
      <div className="flex flex-col gap-5">
        {areas.map((ar) => {
          const xs = pasillos.filter((x) => (x.a ?? "") === ar).sort((a, b) => a.k.localeCompare(b.k, "es", { numeric: true }));
          return (
            <div key={ar}>
              <p className="mb-1 text-sm font-bold">{ar || "Sin área"} <span className="font-normal text-suave">· {xs.length} pasillos</span></p>
              <div className="overflow-x-auto pb-1">
                <div className="flex items-stretch gap-[3px]" style={{ minWidth: xs.length * 34 }}>
                  <span className="w-2 rounded bg-[repeating-linear-gradient(45deg,var(--color-borde,#ccc)_0_3px,transparent_3px_6px)]" title="Pared" />
                  {xs.map((x) => { const v = pct(x), on = sp.pasillo === x.k; return (
                    <Link key={x.k} href={href(x.k)} scroll={false} title={`${x.k} · ${x.oc}/${x.pos} · ${v.toFixed(1)}%`}
                      className={`flex w-8 shrink-0 flex-col items-center gap-[2px] rounded-md p-[2px] ${on ? "ring-2 ring-marca" : "hover:ring-2 hover:ring-borde"}`}>
                      <span className="h-24 w-full rounded-sm" style={{ background: fondo(v), opacity: x.pos ? 0.35 + v / 160 : 0.15 }} />
                      <span className="text-[10px] font-bold leading-none">{x.k.split("-")[1] ?? x.k}</span>
                      <span className="text-[9px] tabular-nums leading-none text-suave">{Math.round(v)}%</span>
                    </Link>); })}
                </div>
                <div className="mt-1 border-t-2 border-amber-400 pt-0.5 text-center text-[10px] tracking-widest text-suave" style={{ minWidth: xs.length * 34 }}>CORREDOR · SALIDA</div>
              </div>
            </div>);
        })}
      </div>
      <p className="mt-2 flex flex-wrap gap-3 text-xs text-suave"><span>Verde &lt; 70%</span><span>Ámbar 70–85%</span><span>Rojo ≥ 85%</span><span>Más tenue = más libre</span></p>
    </section>
  );
}
