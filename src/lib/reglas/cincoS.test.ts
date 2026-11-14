import { describe, expect, it } from "vitest";
import { BLOQUES_5S, calcular5S } from "./cincoS";

describe("5S", () => {
  it("tiene 21 ítems", () => expect(BLOQUES_5S.flatMap((b) => b.items).length).toBe(21));
  it("puntaje: Cumple 2, Parcial 1, No cumple 0, N.A. no cuenta", () => {
    const r = calcular5S({ "1.1": "Cumple", "1.2": "Parcial", "1.3": "No cumple", "1.4": "N.A." });
    expect(r.porS[0]).toBe(50); // 3 de 6
    expect(r.porS[1]).toBeNull();
    expect(r.total).toBe(50);
    expect(r.nivel).toBe("REGULAR");
  });
  it("niveles", () => {
    const todo = Object.fromEntries(BLOQUES_5S.flatMap((b) => b.items.map(([id]) => [id, "Cumple" as const])));
    expect(calcular5S(todo)).toMatchObject({ total: 100, nivel: "EXCELENTE" });
  });
});
