"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function useTema() {
  const [oscuro, setOscuro] = useState(false);
  useEffect(() => setOscuro(document.documentElement.dataset.theme === "dark"), []);
  function cambiar() {
    const nuevo = !oscuro;
    setOscuro(nuevo);
    document.documentElement.dataset.theme = nuevo ? "dark" : "light";
    try { localStorage.setItem("tema", nuevo ? "dark" : "light"); } catch {}
  }
  return { oscuro, cambiar };
}

/** Botón redondo para cambiar tema (login y pantallas sin barra). */
export function BotonTema({ className = "" }: { className?: string }) {
  const { oscuro, cambiar } = useTema();
  return (
    <button onClick={cambiar} aria-label={oscuro ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      className={`grid h-11 w-11 place-items-center rounded-full border border-borde bg-tarjeta text-texto hover:border-marca ${className}`}>
      {oscuro ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

/** Logo que cambia letras negras/blancas según el tema. */
export function Logo({ className = "h-14 w-auto" }: { className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="OpsPulse · Supply Chain Control" className={`${className} dark:hidden`} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo_blanco.svg" alt="OpsPulse · Supply Chain Control" className={`${className} hidden dark:block`} />
    </>
  );
}
