import * as XLSX from "xlsx";
import { arreglarTexto, parseCSV } from "./csv";

/** Lee CSV o Excel (.xlsx/.xls/.xlsb) y devuelve filas por encabezado, con fechas como d/m/aaaa hh:mm:ss. */
export async function leerArchivo(f: File): Promise<Record<string, string>[]> {
  if (/\.(xlsx|xlsm|xls|xlsb)$/i.test(f.name)) {
    const wb = XLSX.read(await f.arrayBuffer(), { cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { raw: true, defval: "" });
    const p = (n: number) => String(n).padStart(2, "0");
    return filas.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [
      arreglarTexto(k.trim()),
      v instanceof Date
        ? `${p(v.getDate())}/${p(v.getMonth() + 1)}/${v.getFullYear()} ${p(v.getHours())}:${p(v.getMinutes())}:${p(v.getSeconds())}`
        : String(v ?? "").trim(),
    ])));
  }
  return parseCSV(await f.text());
}
export const ACEPTA = ".csv,.xlsx,.xls,.xlsb,text/csv";
