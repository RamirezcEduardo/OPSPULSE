-- =====================================================================
-- OpsPulse · Supply Chain Control · Migración inicial
-- Basada en schema.sql del brief, con mejoras:
--  * Fechas agregadas en America/Lima (no UTC).
--  * Unicidad con NULLS NOT DISTINCT donde la clave admite nulos.
--  * ajuste.cod_alternat sin FK (los códigos sin maestro deben cargarse
--    para listarlos como "sin valor unitario").
--  * ajuste.costo_unitario: costo congelado al cargar, para que los
--    cierres no cambien cuando se actualiza el maestro VALOR.
--  * Roles (admin, auditor, supervisor, lectura) y RLS por rol.
--  * Vistas con security_invoker; resultado de auditoría de reabasto.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 0. ROLES / PERFILES
-- ---------------------------------------------------------------------
create table perfil (
  id         uuid primary key references auth.users(id) on delete cascade,
  nombre     text,
  dni        text,
  rol        text not null default 'lectura'
             check (rol in ('admin','auditor','supervisor','lectura')),
  sitio_id   text default 'CD11',
  creado_en  timestamptz default now()
);

create or replace function public.rol_actual() returns text
language sql stable security definer set search_path = public as
$$ select rol from perfil where id = auth.uid() $$;

create or replace function public.tiene_rol(variadic roles text[]) returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce((select rol from perfil where id = auth.uid()) = any(roles), false) $$;

create or replace function public.crear_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into perfil (id, nombre) values (new.id, coalesce(new.raw_user_meta_data->>'nombre', new.email));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.crear_perfil();

-- ---------------------------------------------------------------------
-- 1. MAESTROS
-- ---------------------------------------------------------------------
create table sitio (
  id      text primary key,
  nombre  text not null,
  tipo    text not null default 'CD' check (tipo in ('CD','PLANTA')),
  activo  boolean not null default true
);

create table area (
  id          serial primary key,
  sitio_id    text references sitio(id),
  codigo      text not null,
  nombre      text not null,
  zona        text,                  -- picking | reserva | virtual
  piso        text,                  -- para ERU por piso
  supervisor  text,
  unique (sitio_id, codigo)
);

create table ubicacion (
  codigo      text primary key,
  sitio_id    text references sitio(id) default 'CD11',
  area_id     int references area(id),
  es_virtual  boolean not null default false,
  pasillo     int,
  modulo      int
);
create index on ubicacion (area_id);

create table producto (
  cod_alternat      text primary key,
  descripcion       text,
  proveedor         text,
  marca             text,            -- primera palabra / familia de marca (cruces)
  familia           text,
  clase_picking     text,
  caja_estandar     numeric,
  cod_barras        text,
  costo_unitario    numeric(14,5),
  costo_actualizado date
);

create table usuario_operativo (
  usuario     text primary key,
  dni         text,
  nombre      text,
  area        text,
  supervisor  text,
  activo      boolean default true
);

create table auditor (
  dni     text primary key,
  nombre  text not null,
  activo  boolean default true
);

create table motivo_mapeo (
  id          serial primary key,
  tipo_regla  text not null check (tipo_regla in ('UBIC_VIRTUAL','COD_ACTIVIDAD','PANTALLA')),
  clave       text not null,
  tipo        text,
  motivo_op   text,
  area_virtual text,                 -- "VIRTUAL …" para el área
  unique (tipo_regla, clave)
);

-- ---------------------------------------------------------------------
-- 2. CARGAS
-- ---------------------------------------------------------------------
create table carga (
  id           uuid primary key default gen_random_uuid(),
  sitio_id     text references sitio(id) default 'CD11',
  fuente       text not null check (fuente in
               ('ERU','SHORTPICK','MANUAL','VALOR','UBICACIONES','PRODUCTOS','USUARIOS','MOTIVOS',
                'REABASTO','MERMA','PROCESOS','INCIDENCIAS','CONTEO')),
  archivo      text,
  filas        int,
  insertadas   int,
  duplicadas   int,
  rechazadas   int,
  cargado_por  uuid references auth.users(id) default auth.uid(),
  cargado_en   timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 3. BOLSA
-- ---------------------------------------------------------------------
create table ajuste (
  id               bigserial primary key,
  carga_id         uuid references carga(id) on delete cascade,
  sitio_id         text references sitio(id) default 'CD11',
  fuente           text not null check (fuente in ('ERU','SHORTPICK','MANUAL')),
  cod_actividad    int,
  historial        text,
  nro_grupo        text,
  cod_alternat     text,
  ubicacion        text,
  a_ubicacion      text,
  fecha            timestamptz not null,
  usuario_creado   text,
  usuario_modif    text,
  pantalla         text,
  cod_razon        text,
  nro_tarea        text,
  nro_lpn          text,
  un_orig          numeric,
  un_ajuste        numeric not null,
  tipo             text,
  motivo_op        text,
  costo_unitario   numeric(14,5),    -- congelado al cargar
  monto_manual     numeric(14,2),
  comentario       text,
  constraint ajuste_unico unique nulls not distinct
    (fuente, nro_grupo, cod_alternat, fecha, un_ajuste, ubicacion, nro_lpn)
);
create index on ajuste (fecha);
create index on ajuste (cod_alternat);
create index on ajuste (nro_grupo);
create index on ajuste (carga_id);

-- Congela el costo vigente si no viene informado
create or replace function public.ajuste_congelar_costo() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.costo_unitario is null and new.fuente <> 'MANUAL' then
    select costo_unitario into new.costo_unitario from producto where cod_alternat = new.cod_alternat;
  end if;
  return new;
end $$;
create trigger ajuste_costo before insert on ajuste
  for each row execute function public.ajuste_congelar_costo();

create table no_considerar (
  id             bigserial primary key,
  nro_grupo      text not null,
  cod_alternat   text,                -- null = todo el grupo
  motivo         text not null,
  comentario     text,
  registrado_por uuid references auth.users(id) default auth.uid(),
  registrado_en  date default (now() at time zone 'America/Lima')::date,
  constraint no_considerar_unico unique nulls not distinct (nro_grupo, cod_alternat)
);

create table cruce (
  id            bigserial primary key,
  grupo_falt text, sku_falt text, un_falt numeric, val_falt numeric, ubic_falt text, fecha_falt date,
  grupo_sob  text, sku_sob  text, un_sob  numeric, val_sob  numeric, ubic_sob  text, fecha_sob  date,
  coincidencia  text,
  cercania      text,
  puntaje       numeric,
  impacto       numeric(14,2),
  decision      text not null default 'Pendiente' check (decision in ('Pendiente','Confirmado','Descartado')),
  comentario    text,
  pasado_nc     boolean default false,
  calculado_en  timestamptz default now(),
  unique (grupo_falt, sku_falt, grupo_sob, sku_sob)
);

create or replace view v_ajuste with (security_invoker = true) as
select a.*,
       p.descripcion, p.proveedor, p.marca, p.familia, p.clase_picking, p.caja_estandar,
       case when a.fuente = 'MANUAL' then a.monto_manual
            else round(coalesce(a.costo_unitario, p.costo_unitario, 0) * a.un_ajuste, 2) end as valor,
       (a.fuente <> 'MANUAL' and coalesce(a.costo_unitario, p.costo_unitario) is null)        as sin_costo,
       u.area_id,
       case when coalesce(a.ubicacion,'') = '' then 'LPN SIN UBICACION'
            when u.es_virtual or a.ubicacion like 'XX-%' then coalesce(mv.area_virtual, 'VIRTUAL')
            else coalesce(ar.nombre, 'SIN AREA') end                                          as area_nombre,
       ar.piso,
       coalesce(nc.motivo, nc2.motivo)                                                       as motivo_auditor,
       case when coalesce(nc.motivo, nc2.motivo) is not null
              or a.motivo_op in ('AJUSTE SIEMBRA','CREA LPN MULTISKU','CREA LPN CARTONES')
            then 'NO CONSIDERAR' else 'CONSIDERAR' end                                        as gestion,
       (a.fecha at time zone 'America/Lima')::date                                            as dia,
       date_trunc('month', a.fecha at time zone 'America/Lima')::date                         as mes,
       'Q' || extract(quarter from a.fecha at time zone 'America/Lima')                       as trimestre,
       to_char(a.fecha at time zone 'America/Lima', 'IYYY-"S"IW')                             as semana
from ajuste a
left join producto p        on p.cod_alternat = a.cod_alternat
left join ubicacion u       on u.codigo = a.ubicacion
left join area ar           on ar.id = u.area_id
left join motivo_mapeo mv   on mv.tipo_regla = 'UBIC_VIRTUAL' and mv.clave = a.ubicacion
left join no_considerar nc  on nc.nro_grupo = a.nro_grupo and nc.cod_alternat = a.cod_alternat
left join no_considerar nc2 on nc2.nro_grupo = a.nro_grupo and nc2.cod_alternat is null;

-- ---------------------------------------------------------------------
-- 4. ERU / ERI
-- ---------------------------------------------------------------------
create table conteo_ciclico (
  id           bigserial primary key,
  carga_id     uuid references carga(id) on delete cascade,
  fecha        date not null,
  ubicacion    text,
  cod_alternat text,
  contada      boolean,
  con_error    boolean,
  faltante     numeric,
  sobrante     numeric
);
create index on conteo_ciclico (fecha);

create or replace view v_eru with (security_invoker = true) as
select date_trunc('month', c.fecha)::date mes, ar.nombre area, ar.piso,
       count(*) filter (where contada) contadas,
       count(*) filter (where contada and not con_error) correctas,
       round(100.0 * count(*) filter (where contada and not con_error)
             / nullif(count(*) filter (where contada),0), 1) eru_pct
from conteo_ciclico c
left join ubicacion u on u.codigo = c.ubicacion
left join area ar on ar.id = u.area_id
group by 1,2,3;

-- ---------------------------------------------------------------------
-- 5. VAS
-- ---------------------------------------------------------------------
create or replace view v_vas with (security_invoker = true) as
select *, case when clase_picking in ('ADAPTO','AFRAME') then 'KNAPP' else clase_picking end as grupo_picking
from v_ajuste where motivo_op in ('VAS','CREA LPN VAS');

-- ---------------------------------------------------------------------
-- 6. MERMA
-- ---------------------------------------------------------------------
create table merma (
  id           bigserial primary key,
  carga_id     uuid references carga(id) on delete cascade,
  fecha        date not null,
  area         text,
  cod_alternat text,
  descripcion  text,
  familia      text,
  motivo       text,
  unidades     numeric,
  valor        numeric(14,2)
);
create index on merma (fecha);

-- ---------------------------------------------------------------------
-- 7. PROCESOS PENDIENTES
-- ---------------------------------------------------------------------
create table lpn_pendiente (
  id                  bigserial primary key,
  carga_id            uuid references carga(id) on delete set null,
  nro_lpn             text not null,
  proceso             text not null,
  cod_alternat        text,
  unidades            numeric,
  valor               numeric(14,2),
  fecha_creacion      timestamptz,
  fecha_ingreso       date default (now() at time zone 'America/Lima')::date,
  ubicacion_actual    text,
  area                text,
  supervisor          text,
  responsable         text,
  dni_causo           text,
  fecha_levantamiento date,
  dni_levanto         text,
  accion              text,
  visto_ultima_carga  boolean not null default true,
  estado              text generated always as
                      (case when fecha_levantamiento is not null then 'LEVANTADO' else 'PENDIENTE' end) stored,
  unique (nro_lpn, proceso)
);

create or replace view v_lpn_pendiente with (security_invoker = true) as
with b as (
  select l.*, coalesce(l.fecha_levantamiento, (now() at time zone 'America/Lima')::date)
              - (l.fecha_creacion at time zone 'America/Lima')::date as dias_demora
  from lpn_pendiente l)
select *,
  case when dias_demora <= 2  then '1. 0-2 días'
       when dias_demora <= 7  then '2. 3-7 días'
       when dias_demora <= 15 then '3. 8-15 días'
       when dias_demora <= 30 then '4. 16-30 días'
       else '5. Más de 30 días' end as tramo,
  case when estado = 'PENDIENTE' and not visto_ultima_carga then 'YA NO FIGURA – PONER FECHA' end as alerta
from b;

-- ---------------------------------------------------------------------
-- 8. REABASTO + AUDITORÍA
-- ---------------------------------------------------------------------
create table tarea_reabasto (
  clave         text primary key,
  carga_id      uuid references carga(id) on delete cascade,
  fecha         timestamptz not null,
  turno         text check (turno in ('Mañana','Tarde','Noche')),
  nro_tarea text, nro_orden text,
  tipo_asignac  text,
  estado        text check (estado in ('Finalizada','Cancelado')),
  cod_alternat text, descripcion text,
  cantidad      numeric,
  nro_lpn text, lote text, fecha_venc date,
  ubic_destino text, area text,
  usuario       text
);
create index on tarea_reabasto (fecha);

create table parametro (
  clave  text primary key,
  valor  jsonb not null
);
insert into parametro values
  ('muestra_reabasto', '{"consol_max":5,"aleatorias":25,"max_por_usuario":3,"incluir_canceladas":true}');

create table auditoria_reabasto (
  id               bigserial primary key,
  clave            text not null references tarea_reabasto(clave) on delete cascade,
  motivo_seleccion text check (motivo_seleccion in ('CANCELADA','CONSOLIDACIÓN','ALEATORIA','MANUAL')),
  fecha_auditoria  date,
  dni_auditor      text references auditor(dni),
  p1_ubic_correcta  text check (p1_ubic_correcta  in ('Sí','No','N.A.')),
  p2_sin_mezcla     text check (p2_sin_mezcla     in ('Sí','No','N.A.')),
  p3_cant_cuadra    text check (p3_cant_cuadra    in ('Sí','No','N.A.')),
  cant_contada      numeric,
  p4_lote           text check (p4_lote           in ('Sí','No','N.A.')),
  p5_fefo           text check (p5_fefo           in ('Sí','No','N.A.')),
  p6_pasillo_limpio text check (p6_pasillo_limpio in ('Sí','No','N.A.')),
  hallazgo     text,
  comentario   text,
  unique (clave)
);

create or replace view v_auditoria_reabasto with (security_invoker = true) as
with b as (
  select a.*, t.fecha, t.area, t.usuario, t.turno, t.tipo_asignac, t.estado,
    (select count(*) from unnest(array[p1_ubic_correcta,p2_sin_mezcla,p3_cant_cuadra,p4_lote,p5_fefo,p6_pasillo_limpio]) x where x in ('Sí','No')) evaluados,
    (select count(*) from unnest(array[p1_ubic_correcta,p2_sin_mezcla,p3_cant_cuadra,p4_lote,p5_fefo,p6_pasillo_limpio]) x where x = 'Sí') cumplen,
    (select count(*) from unnest(array[p1_ubic_correcta,p2_sin_mezcla,p3_cant_cuadra,p4_lote,p5_fefo,p6_pasillo_limpio]) x where x is not null) respondidos
  from auditoria_reabasto a join tarea_reabasto t using (clave))
select *,
  case when evaluados > 0 and cumplen = evaluados then 'CONFORME'
       when evaluados > 0 then 'NO CONFORME'
       when fecha_auditoria is not null or respondidos > 0 then 'SIN EVALUAR'
       else 'PENDIENTE' end as resultado
from b;

-- ---------------------------------------------------------------------
-- 9. AUDITORÍA 5S
-- ---------------------------------------------------------------------
create table auditoria_5s (
  id            bigserial primary key,
  fecha         date not null,
  dni_auditor   text, nombre_auditor text,
  area          text, ubicacion text, turno text, supervisor text,
  respuestas    jsonb not null,
  pct_s1 numeric, pct_s2 numeric, pct_s3 numeric, pct_s4 numeric, pct_s5 numeric,
  pct_total     numeric,
  nivel         text check (nivel in ('EXCELENTE','BUENO','REGULAR','DEFICIENTE')),
  hallazgos text, accion_correctiva text, fotos text[],
  creado_por    uuid references auth.users(id) default auth.uid(),
  creado_en     timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 10. INCIDENCIAS
-- ---------------------------------------------------------------------
create table incidencia (
  id            bigserial primary key,
  fecha         date not null,
  dni text, nombre text, area text, turno text,
  tipo text, proceso text,
  cod_alternat text, descripcion text,
  ubic_asignada text, unidad text, cantidad numeric, lpn text,
  ubicado boolean, ubic_encontrada text,
  devuelto boolean,
  comentarios text,
  fotos         text[],
  creado_por    uuid references auth.users(id) default auth.uid(),
  creado_en     timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 11. SEGUIMIENTO OPERATIVO
-- ---------------------------------------------------------------------
create table kpi_operativo (
  id          bigserial primary key,
  sitio_id    text references sitio(id) default 'CD11',
  fecha       date not null,
  proceso     text not null check (proceso in ('RECEPCION','ALMACENAMIENTO','REABASTECIMIENTO','PICKING','DESPACHO','INVENTARIO','PRODUCCION')),
  area        text,
  turno       text,
  indicador   text not null,
  valor       numeric,
  meta        numeric,
  constraint kpi_unico unique nulls not distinct (sitio_id, fecha, proceso, area, turno, indicador)
);

-- ---------------------------------------------------------------------
-- 12. SEGURIDAD (RLS por rol)
-- ---------------------------------------------------------------------
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname='public' loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "lectura" on %I for select to authenticated using (true)', t);
    execute format('create policy "admin escribe" on %I for all to authenticated using (tiene_rol(''admin'')) with check (tiene_rol(''admin''))', t);
  end loop; end $$;

-- perfil: cada uno ve el suyo; admin ve todos
drop policy "lectura" on perfil;
create policy "perfil propio" on perfil for select to authenticated using (id = auth.uid() or tiene_rol('admin'));

create policy "auditor reabasto" on auditoria_reabasto for all to authenticated
  using (tiene_rol('auditor')) with check (tiene_rol('auditor'));
create policy "auditor 5s" on auditoria_5s for insert to authenticated
  with check (tiene_rol('auditor','supervisor'));
create policy "supervisor incidencia" on incidencia for insert to authenticated
  with check (tiene_rol('supervisor','auditor'));
create policy "supervisor levanta lpn" on lpn_pendiente for update to authenticated
  using (tiene_rol('supervisor','auditor')) with check (tiene_rol('supervisor','auditor'));

-- Storage para fotos (5S e incidencias)
insert into storage.buckets (id, name, public) values ('fotos','fotos', false)
  on conflict (id) do nothing;
create policy "fotos lectura" on storage.objects for select to authenticated using (bucket_id = 'fotos');
create policy "fotos subida" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and tiene_rol('admin','auditor','supervisor'));

-- ---------------------------------------------------------------------
-- 13. DATOS BASE
-- ---------------------------------------------------------------------
insert into sitio values ('CD11','Centro de Distribución 11','CD',true);
