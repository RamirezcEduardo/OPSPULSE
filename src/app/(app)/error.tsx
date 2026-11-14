"use client";

export default function ErrorApp({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-xl bg-tarjeta p-6">
      <h1 className="text-lg font-bold">No se pudo mostrar esta pantalla</h1>
      <p className="mt-2 text-sm text-suave">
        Puede faltar una actualización de la base de datos (SQL pendiente) o hubo un error temporal.
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-suave">Código: {error.digest}</p>}
      <button onClick={reset} className="mt-4 h-10 rounded-lg bg-marca px-4 text-sm font-semibold text-white">Reintentar</button>
    </div>
  );
}
