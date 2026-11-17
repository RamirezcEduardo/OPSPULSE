import Link from "next/link";
import { exigirAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ROLES } from "@/lib/roles";
import { GRUPOS } from "@/lib/modulos";
import { Matriz } from "./Matriz";

export const dynamic = "force-dynamic";

export default async function Permisos({ searchParams }: { searchParams: Promise<{ usuario?: string }> }) {
  await exigirAdmin();
  const { usuario } = await searchParams;
  const supabase = await createClient();
  const [{ data: reglas }, { data: usuarios }] = await Promise.all([
    supabase.from("permiso_modulo").select("sujeto_tipo,sujeto,modulo,nivel"),
    supabase.rpc("admin_listar_usuarios"),
  ]);
  const us = (usuarios ?? []) as { id: string; usuario: string; nombre: string | null; rol: string }[];
  const sel = us.find((u) => u.id === usuario);
  return (
    <div className="flex flex-col gap-5">
      <header>
        <Link href="/configuracion" className="text-sm text-suave hover:text-marca">← Configuración</Link>
        <h1 className="text-2xl font-extrabold">Permisos por vista</h1>
        <p className="mt-1 text-sm text-suave">
          <b>Sin acceso</b>: no ve el módulo · <b>Ver</b>: solo dashboards · <b>Registrar</b>: además usa los formularios (auditar, validar, buscar) ·
          <b> Editar / cargar</b>: además sube archivos. La regla del <b>usuario</b> manda sobre la del <b>rol</b>. Por defecto: admin = Editar, resto = Ver.
        </p>
      </header>
      <section className="rounded-xl bg-tarjeta p-5">
        <h2 className="mb-3 font-semibold">Por rol</h2>
        <Matriz grupos={GRUPOS} columnas={Object.entries(ROLES).map(([k, v]) => ({ tipo: "rol" as const, id: k, titulo: v }))}
          reglas={(reglas ?? []).filter((r) => r.sujeto_tipo === "rol")} />
      </section>
      <section className="rounded-xl bg-tarjeta p-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-semibold">Por usuario (excepciones)</h2>
          <form className="flex items-end gap-2">
            <label className="flex flex-col gap-1 text-xs text-suave">Usuario
              <select name="usuario" defaultValue={usuario ?? ""} className="h-10 rounded-lg border border-borde bg-tarjeta px-2 text-sm text-texto">
                <option value="">— Elegir —</option>
                {us.map((u) => <option key={u.id} value={u.id}>{u.nombre ?? u.usuario} ({u.usuario} · {u.rol})</option>)}
              </select></label>
            <button className="h-10 rounded-lg border border-borde bg-tarjeta px-3 text-sm">Ver</button>
          </form>
        </div>
        {sel ? (
          <Matriz grupos={GRUPOS} columnas={[{ tipo: "usuario", id: sel.id, titulo: `${sel.nombre ?? sel.usuario}` }]}
            reglas={(reglas ?? []).filter((r) => r.sujeto_tipo === "usuario" && r.sujeto === sel.id)} conHeredar />
        ) : <p className="text-sm text-suave">Elige un usuario para darle o quitarle acceso a módulos puntuales.</p>}
      </section>
    </div>
  );
}
