"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    setCargando(false);
    if (error) return setError("Correo o contraseña incorrectos.");
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen grid place-items-center bg-grafito px-4">
      <form onSubmit={entrar} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl flex flex-col gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="OpsPulse · Supply Chain Control" className="h-14 w-auto self-start" />
        <h1 className="text-xl font-bold mt-2">Iniciar sesión</h1>
        <label className="flex flex-col gap-1 text-sm">
          Correo
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-lg border border-neutral-300 px-3 focus:outline-2 focus:outline-marca" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Contraseña
          <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-lg border border-neutral-300 px-3 focus:outline-2 focus:outline-marca" />
        </label>
        {error && <p role="alert" className="text-sm text-marca-oscuro">{error}</p>}
        <button disabled={cargando} className="h-11 rounded-lg bg-marca font-semibold text-white hover:bg-marca-oscuro disabled:opacity-60">
          {cargando ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </main>
  );
}
