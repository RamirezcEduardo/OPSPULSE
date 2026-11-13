const soles = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const entero = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** S/ 1,234.56 — negativos como S/ -1,234.56 */
export const fmtSoles = (n: number | null | undefined) =>
  n == null ? "—" : `S/ ${soles.format(n)}`;
export const fmtNum = (n: number | null | undefined) => (n == null ? "—" : entero.format(n));
/** dd/mm/yyyy en hora de Lima */
export const fmtFecha = (d: string | Date | null | undefined) =>
  d == null
    ? "—"
    : new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "numeric" }).format(
        typeof d === "string" ? new Date(d) : d,
      );
