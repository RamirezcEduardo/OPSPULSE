-- Aplicada en Supabase (OPSPULSE.PE). ERI por mes + área + SKU y funciones de resumen.
create table if not exists eri_sku (
  id bigint generated always as identity primary key, carga_id uuid references carga(id) on delete cascade,
  mes text not null, area text not null, cod_alternat text not null, descripcion text,
  conteos int not null default 0, faltante numeric not null default 0, sobrante numeric not null default 0,
  unique (mes, area, cod_alternat));
-- RLS: lectura para autenticados; escritura con nivel_modulo('/cargas') = 'editar'.
-- Funciones: eri_mensual(), eri_area(), eri_top(p_n) — ver definición en Supabase.
