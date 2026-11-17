"use client";

import { Fragment, useState, useTransition } from "react";
import { NIVELES, type Nivel } from "@/lib/modulos";
import { guardarPermiso } from "./actions";

type Col = { tipo: "rol" | "usuario"; id: string; titulo: string };
type Regla = { sujeto_tipo: string; sujeto: string; modulo: string; nivel: string };

export function Matriz({ grupos, columnas, reglas, conHeredar = false }: { grupos: { titulo: string; items: { href: string; label: string }[] }[]; columnas: Col[]; reglas: Regla[]; conHeredar?: boolean }) {
  const [valores, setValores] = useState(() => new Map(reglas.map((r) => [`${r.sujeto}|${r.modulo}`, r.nivel])));
  const [pend, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const defecto = (c: Col) => (c.tipo === "rol" && c.id === "admin" ? "editar" : "ver");
  function cambiar(c: Col, modulo: string, v: string) {
    setMsg(null);
    setValores((m) => { const n = new Map(m); if (v === "heredar" || (!conHeredar && v === defecto(c))) n.delete(`${c.id}|${modulo}`); else n.set(`${c.id}|${modulo}`, v); return n; });
    start(async () => {
      try { await guardarPermiso(c.tipo, c.id, modulo, (v === defecto(c) && !conHeredar ? "heredar" : v) as Nivel | "heredar"); setMsg("Guardado ✓"); }
      catch (e) { setMsg(e instanceof Error ? e.message : "Error"); }
    });
  }
  return (
    <div className="overflow-x-auto">
      {msg && <p role="status" className="mb-2 text-sm text-suave">{pend ? "Guardando…" : msg}</p>}
      <table className="w-full min-w-[640px] text-sm">
        <thead className="text-left text-suave"><tr><th className="border-b border-borde px-2 py-2 font-medium">Módulo</th>
          {columnas.map((c) => <th key={c.id} className="border-b border-borde px-2 py-2 font-medium">{c.titulo}</th>)}</tr></thead>
        <tbody>{grupos.map((g) => (<Fragment key={g.titulo}>
          <tr><td colSpan={columnas.length + 1} className="bg-fondo px-2 py-1.5 text-xs font-bold uppercase text-suave">{g.titulo}</td></tr>
          {g.items.map((m) => (
            <tr key={m.href} className="border-b border-borde">
              <td className="px-2 py-1.5">{m.label}</td>
              {columnas.map((c) => {
                const v = valores.get(`${c.id}|${m.href}`) ?? (conHeredar ? "heredar" : defecto(c));
                return (
                  <td key={c.id} className="px-2 py-1.5">
                    <select aria-label={`${m.label} · ${c.titulo}`} value={v} onChange={(e) => cambiar(c, m.href, e.target.value)}
                      className={`h-9 rounded-lg border px-2 ${v === "ninguno" ? "border-marca text-marca" : "border-borde"} bg-tarjeta`}>
                      {conHeredar && <option value="heredar">Según su rol</option>}
                      {NIVELES.map((n) => <option key={n.v} value={n.v}>{n.t}</option>)}
                    </select>
                  </td>);
              })}
            </tr>))}
        </Fragment>))}</tbody>
      </table>
    </div>
  );
}
