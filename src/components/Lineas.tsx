"use client";

import { Bar, CartesianGrid, ComposedChart, LabelList, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const PALETA = ["#3B82F6", "#EF4444", "#EAB308", "#22C55E", "#F97316", "#8B5CF6", "#14B8A6", "#EC4899"];

/** Líneas de porcentaje (0–100). `series` = nombres de columnas; la última serie destacada (p. ej. TOTAL CD). */
export function Lineas({ titulo, datos, series, etiquetas = false, min = 40, destacar, alto = 280 }: {
  titulo: string; datos: Record<string, string | number | null>[]; series: string[]; etiquetas?: boolean; min?: number; destacar?: string; alto?: number;
}) {
  return (
    <section className="rounded-xl bg-tarjeta p-5">
      <h2 className="mb-3 font-semibold">{titulo}</h2>
      {!datos.length ? <p className="text-sm text-suave">Sin datos.</p> : (
        <div style={{ height: alto }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={datos} margin={{ top: 18, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid stroke="currentColor" strokeOpacity={0.1} vertical={false} />
              <XAxis dataKey="x" tick={{ fontSize: 11, fill: "currentColor" }} interval="preserveStartEnd" />
              <YAxis domain={[min, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: "currentColor" }} width={44} />
              <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{ fontSize: 12 }} />
              {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {series.map((k, i) => (
                <Line key={k} dataKey={k} type="linear" connectNulls={false} isAnimationActive={false}
                  stroke={series.length === 1 ? "#E11D2E" : k === destacar ? "#111827" : PALETA[i % PALETA.length]} strokeWidth={k === destacar || series.length === 1 ? 3 : 2}
                  dot={{ r: 3 }}>
                  {etiquetas && <LabelList dataKey={k} position="top" fontSize={10} formatter={(v: number) => (v == null ? "" : `${v}%`)} />}
                </Line>))}
            </LineChart>
          </ResponsiveContainer>
        </div>)}
    </section>
  );
}

/** Barras faltante (rojo) / sobrante (gris) con línea de neto, en S/. */
export function Combo({ titulo, datos, alto = 300 }: { titulo: string; datos: { x: string; falt: number; sob: number; neto: number }[]; alto?: number }) {
  const s = (v: number) => `S/ ${Math.round(v).toLocaleString("es-PE")}`;
  return (
    <section className="rounded-xl bg-tarjeta p-5">
      <h2 className="mb-3 font-semibold">{titulo}</h2>
      {!datos.length ? <p className="text-sm text-suave">Sin datos.</p> : (
        <div style={{ height: alto }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={datos} margin={{ top: 18, right: 16, left: 10, bottom: 4 }}>
              <CartesianGrid stroke="currentColor" strokeOpacity={0.1} vertical={false} />
              <XAxis dataKey="x" tick={{ fontSize: 11, fill: "currentColor" }} />
              <YAxis tickFormatter={(v) => s(v)} tick={{ fontSize: 10, fill: "currentColor" }} width={90} />
              <Tooltip formatter={(v: number) => s(v)} contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.4} />
              <Bar dataKey="falt" name="Faltante S/" fill="#E11D2E" isAnimationActive={false} />
              <Bar dataKey="sob" name="Sobrante S/" fill="#A3A3A3" isAnimationActive={false} />
              <Line dataKey="neto" name="Neto S/" stroke="#111827" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false}>
                <LabelList dataKey="neto" position="top" fontSize={10} formatter={(v: number) => s(v)} />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        </div>)}
    </section>
  );
}
