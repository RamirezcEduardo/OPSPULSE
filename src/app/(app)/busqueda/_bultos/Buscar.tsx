"use client";

import { useMemo, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Fotos } from "@/components/Fotos";
import { fmtNum, fmtSoles } from "@/lib/formato";
import { registrarRecuperacion } from "./actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type B = Record<string, any>;

export function BuscarBultos({ clas, bultos }: { clas: "perdidos" | "sin_ubicacion"; bultos: B[] }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<B | null>(null);
  const [lista, setLista] = useState(bultos);
  const filtrados = useMemo(() => {
    const t = q.trim().toUpperCase();
    return t ? lista.filter((b) => `${b.nro_lpn} ${b.cod_alternat} ${b.descripcion ?? ""} ${b.ubicacion ?? ""}`.toUpperCase().includes(t)) : lista;
  }, [q, lista]);
  const [und, setUnd] = useState("");
  const [area, setArea] = useState("");
  const [ubic, setUbic] = useState("");
  const [dni, setDni] = useState("");
  const [coment, setComent] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [pend, start] = useTransition();
  const abrir = (b: B) => { setSel(b); setUnd(String(b.unidades_pendientes ?? "")); setArea(""); setUbic(""); setDni(""); setComent(""); setFotos([]); setMsg(null); };

  function guardar() {
    const u = Number(und);
    const valorUnit = sel!.cantidad_actual ? Number(sel!.valor_total ?? 0) / Number(sel!.cantidad_actual) : 0;
    start(async () => {
      const r = await registrarRecuperacion(clas, { bulto_id: sel!.id, unidades: u, valor: Math.round(u * valorUnit * 100) / 100, area_encontrado: area || null, ubicacion_encontrado: ubic.toUpperCase() || null, dni_recupero: dni || null, fotos, comentario: coment || null });
      setMsg(r.mensaje);
      if (r.ok) {
        const resta = Number(sel!.unidades_pendientes) - u;
        setLista((l) => resta <= 0 ? l.filter((x) => x.id !== sel!.id) : l.map((x) => x.id === sel!.id ? { ...x, unidades_pendientes: resta, estado: "parcial" } : x));
        setSel(null);
      }
    });
  }

  if (sel) return (
    <article className="flex flex-col gap-4 rounded-xl bg-tarjeta p-5">
      <button onClick={() => setSel(null)} className="self-start text-sm text-suave">← Volver a la lista</button>
      <div>
        <p className="font-mono text-xl font-extrabold">{sel.nro_lpn}</p>
        <p className="mt-1 font-semibold">{sel.cod_alternat} · {sel.descripcion}</p>
        <p className="text-sm text-suave">Salió de {sel.ubicacion ?? "—"} · {sel.area ?? "—"} · {sel.dias_demora} días</p>
        <p className="text-sm">Pendiente <b>{fmtNum(sel.unidades_pendientes)} und</b> · {fmtSoles(Number(sel.valor_pendiente))}</p>
      </div>
      <label className="flex flex-col gap-1 text-sm font-semibold">Unidades recuperadas
        <input type="number" inputMode="numeric" value={und} onChange={(e) => setUnd(e.target.value)} className="h-12 rounded-xl border border-borde bg-tarjeta px-3 text-lg font-normal" />
        <span className="text-xs font-normal text-suave">Si es menos que lo pendiente, queda como PARCIAL y puedes registrar más después.</span></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-sm">Área donde se encontró<input value={area} onChange={(e) => setArea(e.target.value.toUpperCase())} className="h-12 rounded-xl border border-borde bg-tarjeta px-3" /></label>
        <label className="flex flex-col gap-1 text-sm">Ubicación<input value={ubic} onChange={(e) => setUbic(e.target.value)} className="h-12 rounded-xl border border-borde bg-tarjeta px-3 font-mono" /></label>
      </div>
      <label className="flex flex-col gap-1 text-sm">DNI de quien lo recuperó<input inputMode="numeric" value={dni} onChange={(e) => setDni(e.target.value)} className="h-12 rounded-xl border border-borde bg-tarjeta px-3" /></label>
      <Fotos carpeta={clas} fotos={fotos} setFotos={setFotos} />
      <textarea rows={2} placeholder="Comentario (opcional)" value={coment} onChange={(e) => setComent(e.target.value)} className="rounded-xl border border-borde bg-tarjeta p-3 text-sm" />
      <button disabled={pend || !(Number(und) > 0)} onClick={guardar} className="h-14 rounded-xl bg-marca text-lg font-bold text-white disabled:opacity-40">{pend ? "Guardando…" : "Registrar recuperación"}</button>
      {msg && <p role="status" className="text-center text-sm">{msg}</p>}
    </article>
  );

  return (
    <div className="flex flex-col gap-3">
      {msg && <p role="status" className="rounded-xl bg-green-100 p-3 text-sm font-semibold text-green-800">{msg}</p>}
      <label className="flex h-12 items-center gap-2 rounded-xl border border-borde bg-tarjeta px-3">
        <Search size={18} className="text-suave" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar LPN, SKU, descripción o ubicación" className="h-full flex-1 bg-transparent outline-none" aria-label="Buscar" />
      </label>
      <p className="text-xs text-suave">{filtrados.length} bultos pendientes · más antiguos primero</p>
      {filtrados.slice(0, 200).map((b) => (
        <button key={b.id} onClick={() => abrir(b)} className="flex flex-col gap-1 rounded-xl bg-tarjeta p-4 text-left active:scale-[.99]">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-sm font-bold">{b.nro_lpn}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${b.dias_demora > 15 ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-900"}`}>{b.dias_demora} días</span>
          </div>
          <span className="truncate text-sm">{b.cod_alternat} · {b.descripcion}</span>
          <span className="text-xs text-suave">{b.area ?? "—"} · pend. {fmtNum(b.unidades_pendientes)} und · {fmtSoles(Number(b.valor_pendiente))} {b.estado === "parcial" ? "· PARCIAL" : ""} {b.alerta ? `· ${b.alerta}` : ""}</span>
        </button>))}
    </div>
  );
}
