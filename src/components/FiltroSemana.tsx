/** Selector de semana (formulario GET). Valor "" = todas. */
export function FiltroSemana({ semanas, actual }: { semanas: string[]; actual?: string }) {
  return (
    <form className="flex items-end gap-2">
      <label className="flex flex-col gap-1 text-xs text-suave">Semana
        <select name="semana" defaultValue={actual ?? ""} className="h-10 rounded-lg border border-borde bg-tarjeta px-2 text-sm text-texto">
          <option value="">Todas</option>
          {semanas.map((s) => <option key={s} value={s}>{s.replace("-S", " · SEM ")}</option>)}
        </select>
      </label>
      <button className="h-10 rounded-lg border border-borde bg-tarjeta px-3 text-sm">Ver</button>
    </form>
  );
}
