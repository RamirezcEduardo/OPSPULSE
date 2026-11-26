import { Contraparte } from "@/components/Contraparte";

export default async function Cruces({ searchParams }: { searchParams: Promise<{ sku?: string; desde?: string }> }) {
  const sp = await searchParams;
  const sku = sp.sku?.trim() ?? "";
  return (
    <div className="flex flex-col gap-4">
      <header><p className="text-sm text-suave">Control de inventario</p><h1 className="text-2xl font-extrabold">Consultor de posibles cruces</h1>
        <p className="text-sm text-suave">Busca un SKU y ve todos sus movimientos en la bolsa (conteo cíclico, ajustes LPN y shortpick): faltantes en rojo, sobrantes en verde. Si un faltante tiene sobrantes del mismo SKU, es un posible cruce.</p></header>
      <form className="flex flex-wrap items-end gap-2 rounded-xl bg-tarjeta p-4">
        <label className="flex flex-col gap-1 text-xs text-suave">Cod Alternat<input name="sku" defaultValue={sku} inputMode="numeric" required className="h-11 w-48 rounded-lg border border-borde bg-tarjeta px-3 text-base text-texto" /></label>
        <label className="flex flex-col gap-1 text-xs text-suave">Desde (opcional)<input type="date" name="desde" defaultValue={sp.desde ?? ""} className="h-11 rounded-lg border border-borde bg-tarjeta px-2 text-sm text-texto" /></label>
        <button className="h-11 rounded-lg bg-marca px-5 font-semibold text-white">Buscar</button>
      </form>
      {sku && <Contraparte key={sku + (sp.desde ?? "")} sku={sku} desde={sp.desde ?? null} auto />}
    </div>
  );
}
