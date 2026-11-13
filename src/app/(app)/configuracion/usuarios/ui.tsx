"use client";

import { useActionState, useState, useTransition } from "react";
import { ROLES, type Rol } from "@/lib/roles";
import { cambiarAcceso, cambiarRol, crearUsuario, nuevaClave } from "./actions";

const campo = "h-11 rounded-lg border border-borde bg-tarjeta px-3";

export function CrearUsuario() {
  const [estado, accion, enviando] = useActionState(crearUsuario, null);
  return (
    <form action={accion} className="rounded-xl bg-tarjeta p-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <h2 className="font-semibold sm:col-span-2 lg:col-span-3">Nuevo usuario</h2>
      <label className="flex flex-col gap-1 text-sm">Nombre<input name="nombre" required className={campo} /></label>
      <label className="flex flex-col gap-1 text-sm">Usuario<input name="usuario" required autoCapitalize="none" placeholder="ej. 72679263" className={campo} /></label>
      <label className="flex flex-col gap-1 text-sm">Puesto<input name="puesto" className={campo} /></label>
      <label className="flex flex-col gap-1 text-sm">DNI<input name="dni" inputMode="numeric" className={campo} /></label>
      <label className="flex flex-col gap-1 text-sm">Rol
        <select name="rol" defaultValue="lectura" className={campo}>
          {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">Contraseña inicial<input name="password" type="text" minLength={8} required className={campo} /></label>
      <div className="flex items-end">
        <button disabled={enviando} className="h-11 w-full rounded-lg bg-marca font-semibold text-white hover:bg-marca-oscuro disabled:opacity-60">
          {enviando ? "Creando…" : "Crear usuario"}
        </button>
      </div>
      {estado && (
        <p role="status" className={`text-sm sm:col-span-2 lg:col-span-3 ${estado.ok ? "text-green-700 dark:text-green-400" : "text-marca-oscuro"}`}>{estado.mensaje}</p>
      )}
    </form>
  );
}

type U = { id: string; usuario: string; nombre: string; dni: string; puesto: string; rol: string; activo: boolean; ultimo: string };

export function FilaUsuario({ u, esYo }: { u: U; esYo: boolean }) {
  const [pendiente, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const correr = (fn: () => Promise<unknown>) =>
    start(async () => {
      setMsg(null);
      try { await fn(); } catch (e) { setMsg(e instanceof Error ? e.message : "Error"); }
    });

  return (
    <tr className={`border-b border-borde ${pendiente ? "opacity-60" : ""}`}>
      <td className="px-2 py-2 font-medium">{u.nombre || "—"}{esYo && <span className="ml-1 text-xs text-suave">(tú)</span>}</td>
      <td className="px-2 py-2">{u.usuario}</td>
      <td className="px-2 py-2">{u.dni || "—"}</td>
      <td className="px-2 py-2">{u.puesto || "—"}</td>
      <td className="px-2 py-2">
        <select aria-label={`Rol de ${u.usuario}`} defaultValue={u.rol} disabled={esYo}
          onChange={(e) => correr(() => cambiarRol(u.id, e.target.value as Rol))}
          className="h-9 rounded-lg border border-borde bg-tarjeta px-2">
          {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </td>
      <td className="px-2 py-2">{u.ultimo}</td>
      <td className="px-2 py-2">
        <button disabled={esYo} onClick={() => correr(() => cambiarAcceso(u.id, !u.activo))}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${u.activo ? "bg-green-100 text-green-800" : "bg-neutral-200 text-neutral-700"} disabled:opacity-50`}>
          {u.activo ? "Activo" : "Desactivado"}
        </button>
      </td>
      <td className="px-2 py-2">
        <button className="text-xs text-marca hover:underline" onClick={() => {
          const p = prompt(`Nueva contraseña para ${u.usuario} (mín. 8 caracteres)`);
          if (p) correr(async () => { const r = await nuevaClave(u.id, p); setMsg(r.mensaje); });
        }}>Cambiar contraseña</button>
        {msg && <p role="status" className="text-xs text-suave">{msg}</p>}
      </td>
    </tr>
  );
}
