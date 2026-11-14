export default function Cargando() {
  return (
    <div className="flex flex-col gap-5 animate-pulse" aria-busy="true" aria-label="Cargando">
      <div className="h-8 w-64 rounded-lg bg-tarjeta" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-tarjeta" />)}
      </div>
      <div className="h-64 rounded-xl bg-tarjeta" />
    </div>
  );
}
