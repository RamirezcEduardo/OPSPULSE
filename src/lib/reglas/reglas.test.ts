import { describe, expect, it } from "vitest";
import {
  areaDeUbicacion, clasificarMotivo, clasificarTipo, gestion, shortpickAdmitido, SIN_MAPEO,
} from "./clasificacion";
import { diferenciaValorizacion, resumir, valorizar } from "./valorizacion";

const mapeos = {
  ubicVirtual: { "XX-SIN-UBIC-00": "AJUSTE SIN UBICACION", "XX-DROP-01": "AJUSTE DROP" },
  pantalla29: { "CREA LPN VAS": "CREA LPN VAS", "CREA LPN MERMA": "CREA LPN MERMA" },
};

describe("TIPO", () => {
  it.each([
    [{ fuente: "ERU", codActividad: 19, ubicacion: "XX-SIN-UBIC-00" }, "AJUSTE LPN"],
    [{ fuente: "ERU", codActividad: 19, ubicacion: "EA-06-27-20-06" }, "CONTEO CICLICO"],
    [{ fuente: "ERU", codActividad: 17 }, "CONTEO CICLICO"],
    [{ fuente: "ERU", codActividad: 53 }, "CONTEO CICLICO"],
    [{ fuente: "ERU", codActividad: 29 }, "AJUSTE LPN"],
    [{ fuente: "ERU", codActividad: 52 }, "AJUSTE LPN"],
    [{ fuente: "SHORTPICK", codActividad: 4 }, "CONTEO CICLICO"],
  ] as const)("%o → %s", (m, esperado) => expect(clasificarTipo(m)).toBe(esperado));
  it("ubicación xx- en minúsculas también es virtual", () =>
    expect(clasificarTipo({ fuente: "ERU", codActividad: 19, ubicacion: " xx-drop-01" })).toBe("AJUSTE LPN"));
});

describe("MOTIVO OP", () => {
  it("19 en activo", () =>
    expect(clasificarMotivo({ fuente: "ERU", codActividad: 19, ubicacion: "EA-01" }, mapeos)).toBe("AJUSTE ACTIVO"));
  it("19 en virtual según tabla", () => {
    expect(clasificarMotivo({ fuente: "ERU", codActividad: 19, ubicacion: "XX-SIN-UBIC-00" }, mapeos)).toBe("AJUSTE SIN UBICACION");
    expect(clasificarMotivo({ fuente: "ERU", codActividad: 19, ubicacion: "XX-DROP-01" }, mapeos)).toBe("AJUSTE DROP");
  });
  it("19 en virtual sin mapeo queda marcado", () =>
    expect(clasificarMotivo({ fuente: "ERU", codActividad: 19, ubicacion: "XX-NUEVA" }, mapeos)).toBe(SIN_MAPEO));
  it("17, 53, 52 y shortpick", () => {
    expect(clasificarMotivo({ fuente: "ERU", codActividad: 17 })).toBe("AJUSTE RESERVA LPN");
    expect(clasificarMotivo({ fuente: "ERU", codActividad: 53 })).toBe("AJUSTE RESERVA DETALLE LPN");
    expect(clasificarMotivo({ fuente: "ERU", codActividad: 52 })).toBe("VAS");
    expect(clasificarMotivo({ fuente: "SHORTPICK", codActividad: 17 })).toBe("SHORTPICK");
  });
  it("29 según pantalla", () => {
    expect(clasificarMotivo({ fuente: "ERU", codActividad: 29, pantalla: "crea lpn vas" }, mapeos)).toBe("CREA LPN VAS");
    expect(clasificarMotivo({ fuente: "ERU", codActividad: 29, pantalla: "CREA LPN MERMA" }, mapeos)).toBe("CREA LPN MERMA");
    expect(clasificarMotivo({ fuente: "ERU", codActividad: 29, pantalla: "OTRA" }, mapeos)).toBe("CREACION LPN");
  });
  it("shortpick solo cód. 4 y 17", () => {
    expect(shortpickAdmitido(4)).toBe(true);
    expect(shortpickAdmitido(17)).toBe(true);
    expect(shortpickAdmitido(19)).toBe(false);
  });
});

describe("GESTIÓN", () => {
  const exc = [
    { nroGrupo: "733461386", codAlternat: "137325", motivo: "CRUCE" },
    { nroGrupo: "999", codAlternat: null, motivo: "CREACION SUIZO" },
  ];
  it("grupo+SKU excluido", () =>
    expect(gestion({ nroGrupo: "733461386", codAlternat: "137325" }, exc)).toBe("NO CONSIDERAR"));
  it("mismo grupo otro SKU sí se considera", () =>
    expect(gestion({ nroGrupo: "733461386", codAlternat: "1" }, exc)).toBe("CONSIDERAR"));
  it("grupo completo excluido", () => expect(gestion({ nroGrupo: "999", codAlternat: "x" }, exc)).toBe("NO CONSIDERAR"));
  it.each(["AJUSTE SIEMBRA", "CREA LPN MULTISKU", "CREA LPN CARTONES"])("motivo %s", (m) =>
    expect(gestion({ nroGrupo: "1", motivoOp: m }, [])).toBe("NO CONSIDERAR"));
});

describe("ÁREA", () => {
  it("vacía, virtual y física", () => {
    expect(areaDeUbicacion("", {})).toBe("LPN SIN UBICACION");
    expect(areaDeUbicacion("XX-DROP-01", {}, { "XX-DROP-01": "VIRTUAL DROP" })).toBe("VIRTUAL DROP");
    expect(areaDeUbicacion("EA-01", { "EA-01": "Mezzanine 1" })).toBe("Mezzanine 1");
  });
});

describe("VALORIZACIÓN", () => {
  it("unidades × costo, redondeado a 2", () =>
    expect(valorizar({ fuente: "ERU", unAjuste: -3, costoUnitario: 12.34567 })).toEqual({ valor: -37.04, sinCosto: false }));
  it("sin costo", () => expect(valorizar({ fuente: "ERU", unAjuste: 5, costoUnitario: null })).toEqual({ valor: 0, sinCosto: true }));
  it("manual usa su monto", () =>
    expect(valorizar({ fuente: "MANUAL", unAjuste: 0, costoUnitario: null, montoManual: -120.5 }).valor).toBe(-120.5));
  it("resumen faltante / sobrante / neto", () =>
    expect(resumir([-10, 4.5, -0.25])).toEqual({ faltante: -10.25, sobrante: 4.5, neto: -5.75, movimientos: 3 }));
  it("diferencia de valorización cuadra el cierre Q1", () => {
    const d = diferenciaValorizacion("Q1", -17800);
    expect(d).toBe(-53.57);
    expect(-17800 + d).toBeCloseTo(-17853.57, 2);
  });
});
