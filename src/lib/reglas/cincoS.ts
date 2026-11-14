/** Auditoría 5S · CD11 — ítems tomados del formulario actual. */
export const BLOQUES_5S: { s: number; nombre: string; items: [string, string][] }[] = [
  { s: 1, nombre: "Seiri (Clasificar)", items: [
    ["1.1", "En el activo / ubicación solo hay productos que le corresponden"],
    ["1.2", "Mermas y averías fueron retiradas del activo (no se quedan en la ubicación)"],
    ["1.3", "Racks y pasillo libres de cajas vacías, cartón, strech y basura"],
    ["1.4", "En el área solo están los equipos, herramientas y materiales necesarios"],
  ] },
  { s: 2, nombre: "Seiton (Ordenar)", items: [
    ["2.1", "El producto está en su ubicación correcta (sin mezcla de SKU)"],
    ["2.2", "Etiquetas de ubicación visibles y en buen estado"],
    ["2.3", "Cajas master abiertas correctamente (corte limpio, producto de frente, sin dañar unidades)"],
    ["2.4", "Se respeta FEFO (fecha más próxima adelante)"],
    ["2.5", "Pasillos y rutas de tránsito libres"],
  ] },
  { s: 3, nombre: "Seiso (Limpiar)", items: [
    ["3.1", "Piso limpio, sin derrames ni producto suelto"],
    ["3.2", "Racks / activos sin polvo ni residuos"],
    ["3.3", "Tachos disponibles y no rebalsados"],
    ["3.4", "Equipos limpios (transpaletas, terminales, coches)"],
  ] },
  { s: 4, nombre: "Seiketsu (Estandarizar)", items: [
    ["4.1", "Demarcación y señalización del piso visibles"],
    ["4.2", "Zona de merma / averías identificada y usada correctamente"],
    ["4.3", "Rotulado y layout del área visibles y actualizados"],
    ["4.4", "Registro / rol de limpieza al día"],
  ] },
  { s: 5, nombre: "Shitsuke (Disciplina)", items: [
    ["5.1", "Personal con EPP completo"],
    ["5.2", "Personal cumple los procedimientos (reabasto, picking, apertura de cajas)"],
    ["5.3", "Observaciones de la auditoría anterior fueron levantadas"],
    ["5.4", "El personal conoce las 5S y su responsabilidad en el área"],
  ] },
];

export type Respuesta5S = "Cumple" | "Parcial" | "No cumple" | "N.A.";
const PUNTOS: Record<Exclude<Respuesta5S, "N.A.">, number> = { Cumple: 2, Parcial: 1, "No cumple": 0 };

const pct = (rs: (Respuesta5S | undefined)[]) => {
  const ev = rs.filter((r): r is Exclude<Respuesta5S, "N.A."> => !!r && r !== "N.A.");
  if (!ev.length) return null;
  return Math.round((ev.reduce((s, r) => s + PUNTOS[r], 0) / (ev.length * 2)) * 1000) / 10;
};

export function nivel5S(p: number | null) {
  if (p == null) return null;
  return p >= 85 ? "EXCELENTE" : p >= 70 ? "BUENO" : p >= 50 ? "REGULAR" : "DEFICIENTE";
}

/** % por S y % total (N.A. no cuenta). */
export function calcular5S(resp: Record<string, Respuesta5S | undefined>) {
  const porS = BLOQUES_5S.map((b) => pct(b.items.map(([id]) => resp[id])));
  const total = pct(BLOQUES_5S.flatMap((b) => b.items.map(([id]) => resp[id])));
  return { porS, total, nivel: nivel5S(total) };
}
