import { describe, expect, it } from "vitest";
import { parseCSV, fechaLima } from "./csv";
import { faltanColumnas, mapearASN } from "./asn";

const CSV = `﻿Nro ASN;Estado;Tipo ASN;LPN enviadas originales;Recuento de LPN recibidas;Unidades enviadas originales;Cantidad recibida;Fe y Hr Crea;Nombre de proveedor;Información de proveedor;Camp Cabecera Cust 5\r
LPB1;Verificado;ESP;38;32;737;593;13/11/2026 10:30;LOREAL PERU S.A.;;2039\r
A2;Recibiendo;SHIPTO;5;0;100;0;13/11/2026 19:00;;CD PUNTA NEGRA;0\r
`;

describe("parser ASN", () => {
  const filas = parseCSV(CSV);
  it("lee separador ; y BOM", () => {
    expect(filas).toHaveLength(2);
    expect(faltanColumnas(Object.keys(filas[0]))).toEqual([]);
  });
  it("mapea columnas y proveedor de respaldo", () => {
    const a = mapearASN(filas[0]);
    expect(a).toMatchObject({ nro_asn: "LPB1", un_enviadas: 737, un_recibidas: 593, proveedor: "LOREAL PERU S.A.", extra: { "Camp Cabecera Cust 5": "2039" } });
    expect(mapearASN(filas[1]).proveedor).toBe("CD PUNTA NEGRA");
  });
  it("fecha en hora de Lima", () => expect(fechaLima("13/11/2026 07:05")).toBe("2026-11-13T07:05:00-05:00"));
});
