import { describe, it, expect } from "vitest";
import { resumirEru } from "./eru";
const f = (h: string, ubic: string, un: string, sku = "", area = "BA RESERVA", desc = "") => ({ "Historial de actividad": h, Ubicacion: ubic, "Un Ajust": un, "Fe y Hr Crea": "1/11/2026 21:20", UBI: "RESERVA", ubic_area: area, sub_area: "X", "Cod Alternat": sku, Descripcion: desc });
describe("resumirEru", () => {
  it("cuenta ubicaciones y netea ajustes", () => {
    const r = resumirEru([
      f("38 - Recuento", "A-1", "0"), f("38 - Recuento", "A-2", "0"), f("38 - Recuento", "A-3", "0"),
      f("17 - Ajuste", "A-2", "-2", "100", "BA RESERVA", "PROD"), f("17 - Ajuste", "A-2", "2", "100", "BA RESERVA", "PROD"), // se netea
      f("19 - Ajuste", "A-3", "-1", "200", "BA RESERVA", "PROD2"),
      f("4 - Otro", "A-9", "5"),
    ]);
    expect(r.mes).toBe("2026-11");
    expect(r.resumen).toEqual([expect.objectContaining({ contadas: 3, con_error: 1, semana: "SEM44" })]);
    expect(r.ajustes).toHaveLength(3);
    expect(r.productos.find((p) => p.descripcion === "PROD2")?.faltante).toBe(1);
  });
  it("áreas controladas no netean", () => {
    const r = resumirEru([f("17 - A", "C-1", "-2", "1", "CONTROLADOS EST"), f("17 - A", "C-1", "2", "1", "CONTROLADOS EST")]);
    expect(r.resumen[0].con_error).toBe(1);
  });
});
