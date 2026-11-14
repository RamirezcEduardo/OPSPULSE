import { describe, expect, it } from "vitest";
import { mapearReabasto, seleccionarMuestra, turnoDe } from "./reabasto";

const fila = (i: number, estado: string, tipo = "REAB-ACTIVO", area = "EA", usuario = `u${i % 7}`) =>
  mapearReabasto({ "Nro Tarea": `T${i}`, "Nro LPN Entrada": `L${i}`, "Cod Alternat": `${100 + i}`, "Ubic destino": `${area}-01-02-03-04`,
    "Estado de tarea": estado, "Tipo Asignac": tipo, "Cantidad asignada": "10", "Fe y Hr Crea": "12/11/2026 08:04", "Usuario Modificac": usuario });

describe("reabasto", () => {
  it("clave y área", () => {
    const f = fila(1, "Finalizada");
    expect(f.clave).toBe("T1|L1|101|EA-01-02-03-04");
    expect(f.area).toBe("EA");
    expect(f.turno).toBe("Mañana");
  });
  it("turnos", () => {
    expect(turnoDe("2026-11-12T15:00:00-05:00")).toBe("Tarde");
    expect(turnoDe("2026-11-12T23:30:00-05:00")).toBe("Noche");
    expect(turnoDe("2026-11-12T06:59:00-05:00")).toBe("Noche");
  });
  it("muestra: canceladas + máx 5 consol + 25 aleatorias, máx 3 por usuario, sin pendientes", () => {
    const t = [
      ...Array.from({ length: 4 }, (_, i) => fila(i, "Cancelado")),
      ...Array.from({ length: 9 }, (_, i) => fila(100 + i, "Finalizada", "REAB-CONSOL-CAJA")),
      ...Array.from({ length: 200 }, (_, i) => fila(200 + i, "Finalizada", "REAB-ACTIVO", i % 2 ? "EA" : "MZ1")),
      ...Array.from({ length: 10 }, (_, i) => fila(500 + i, "Pendiente")),
    ];
    const m = seleccionarMuestra(t, { aleatorias: 25, consol_max: 5, max_por_usuario: 3, incluir_canceladas: true }, () => 0.5);
    const v = [...m.values()];
    expect(v.filter((x) => x === "CANCELADA")).toHaveLength(4);
    expect(v.filter((x) => x === "CONSOLIDACIÓN")).toHaveLength(5);
    const ale = t.filter((x) => m.get(x.clave) === "ALEATORIA");
    expect(ale.length).toBeLessThanOrEqual(25);
    const porU = ale.reduce<Record<string, number>>((a, x) => ((a[x.usuario!] = (a[x.usuario!] ?? 0) + 1), a), {});
    expect(Math.max(...Object.values(porU))).toBeLessThanOrEqual(3);
    expect(t.filter((x) => x.estado === "Pendiente").some((x) => m.has(x.clave))).toBe(false);
  });
});
