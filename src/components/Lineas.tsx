"use client";

import { CartesianGrid, LabelList, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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
