import { describe, expect, it } from "vitest";
import { arreglarTexto, fechaFlexible } from "./csv";
import { mapearBulto, mapearShortpick } from "./busqueda";

describe("búsqueda de incidencias", () => {
  it("fechas: serial Excel, con segundos y sin ceros", () => {
    expect(fechaFlexible("46053")).toBe("2026-01-31T00:00:00-05:00");
    expect(fechaFlexible("12/11/2026 14:16:18")).toBe("2026-11-12T14:16:18-05:00");
    expect(fechaFlexible("1/11/2026 21:20")).toBe("2026-11-01T21:20:00-05:00");
  });
  it("corrige mojibake", () => expect(arreglarTexto("A ubicaciÃ³n")).toBe("A ubicación"));
  it("shortpick: marca notación científica", () => {
    expect(mapearShortpick({ "Cod Alternat": "1.49E+05", Ubicacion: "EB-1", "Un Ajust": "-1", "Fe y Hr Crea": "31/01/2026 21:08" })._sci).toBe(true);
    expect(mapearShortpick({ "Cod Alternat": "834501", Ubicacion: "EB-1", "Un Ajust": "-1", "Fe y Hr Crea": "31/01/2026 21:08" })).toMatchObject({ _sci: false, un_ajust: -1 });
  });
  it("bulto: clasifica por categoría y limpia el valor", () => {
    const b = mapearBulto({ "Nro LPN": "CJ1", Proceso: "Sin Ubicación", "Cod Alternat": "1", "Val tot": "1234.5" }, "perdidos");
    expect(b).toMatchObject({ clasificacion: "sin_ubicacion", val_tot: 1234.5 });
    expect(mapearBulto({ "Nro LPN": "CJ2", Proceso: "Por Ubicar" }, "sin_ubicacion").clasificacion).toBe("perdidos");
    expect(mapearBulto({ "Nro LPN": "CJ3", Proceso: "Perdido ERU" }, "sin_ubicacion").clasificacion).toBe("perdidos");
  });
});
