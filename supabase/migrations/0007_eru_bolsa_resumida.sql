-- ERU resumido por día + ubicación-área (como hoja "Resumen mes")
create table if not exists eru_resumen (
  id         bigint generated always as identity primary key,
  carga_id   uuid references carga(id) on delete cascade,
  mes        text not null,
  dia        date not null,
  semana     text,
  ubi        text, area text, subarea text,
  contadas   int not null default 0,
  con_error  int not null default 0,
  unique nulls not distinct (dia, ubi, area, subarea)
);
create index if not exists eru_resumen_mes on eru_resumen (mes);

-- Faltantes/sobrantes por producto y día (como hoja "Productos mes"); base del ERI por SKU
create table if not exists eru_producto (
  id           bigint generated always as identity primary key,
  carga_id     uuid references carga(id) on delete cascade,
  mes          text not null,
  dia          date not null,
  semana       text,
  ubi          text, area text,
  cod_alternat text,
  descripcion  text not null,
  faltante     numeric not null default 0,
  sobrante     numeric not null default 0,
  unique nulls not distinct (dia, ubi, area, descripcion)
);
create index if not exists eru_producto_mes on eru_producto (mes);

alter table ajuste add column if not exists mes text, add column if not exists ubi text, add column if not exists area_archivo text, add column if not exists subarea text,
  add column if not exists descripcion_archivo text, add column if not exists valor_ref text;
create index if not exists ajuste_mes on ajuste (mes);

do $$ declare t text; begin
  foreach t in array array['eru_resumen','eru_producto'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "lectura" on %I', t);
    execute format('create policy "lectura" on %I for select to authenticated using (true)', t);
    execute format('drop policy if exists "carga" on %I', t);
    execute format('create policy "carga" on %I for all to authenticated using (nivel_modulo(''/cargas'') = ''editar'') with check (nivel_modulo(''/cargas'') = ''editar'')', t);
  end loop; end $$;
drop policy if exists "carga eru" on ajuste;
create policy "carga eru" on ajuste for all to authenticated using (nivel_modulo('/cargas') = 'editar') with check (nivel_modulo('/cargas') = 'editar');
drop policy if exists "carga crea" on carga;
create policy "carga crea" on carga for all to authenticated using (nivel_modulo('/cargas') = 'editar') with check (nivel_modulo('/cargas') = 'editar');

create or replace function public.eru_borrar_mes(p_mes text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if nivel_modulo('/cargas') <> 'editar' then raise exception 'Sin permiso para cargar'; end if;
  delete from eru_resumen where mes = p_mes;
  delete from eru_producto where mes = p_mes;
  delete from ajuste where fuente = 'ERU' and mes = p_mes;
end $$;
grant execute on function public.eru_borrar_mes(text) to authenticated;
