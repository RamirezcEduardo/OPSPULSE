-- =====================================================================
-- OpsPulse · Supply Chain Control · Esquema base (Supabase / Postgres)
-- CD11 Adecco. Ejecutar en Supabase > SQL Editor (o como migración).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 0. MAESTROS
-- ---------------------------------------------------------------------
create table sitio (
  id          text primary key,              -- 'CD11', 'CD06', 'PLANTA1'
  nombre      text not null,
  tipo        text not null default 'CD',    -- CD | PLANTA
  activo      boolean not null default true
);

create table area (                          -- prefijo de ubicación -> área física
  id          serial primary key,
  sitio_id    text references sitio(id),
  codigo      text not null,                 -- EA, EB, MZ1, MZ2, EST1, KNAPP...
  nombre      text not null,                 -- 'Mezzanine 1', 'Knapp manual'
  zona        text,                          -- picking | reserva | virtual
  supervisor  text,
  unique (sitio_id, codigo)
);

create table ubicacion (                     -- hoja UBICACIONES
  codigo      text primary key,              -- EA-06-27-20-06
  sitio_id    text references sitio(id),
  area_id     int references area(id),
  es_virtual  boolean not null default false,-- XX-, DROP, SIN-, CONTROL, B2B
  pasillo     int,
  modulo      int
);

create table producto (                      -- VALOR + Proveedor + PRODUCTOS
  cod_alternat     text primary key,
  descripcion      text,
  proveedor        text,
  familia          text,                     -- categoría
  clase_picking    text,                     -- ADAPTO, AFRAME, LACTEOS, AAA, OTROS
  caja_estandar    numeric,                  -- unidades por caja máster
  cod_barras       text,
  costo_unitario   numeric(14,5),            -- null = SIN COSTO
  costo_actualizado date
);

create table usuario_operativo (             -- hoja USUARIOS
  usuario     text primary key,              -- usuario WMS (FP60058156, ppizango)
  dni         text,
  nombre      text,
  area        text,
  supervisor  text,
  activo      boolean default true
);

create table auditor (
  dni         text primary key,
  nombre      text not null,
  activo      boolean default true
);

create table motivo_mapeo (                  -- hoja Motivos: reglas de clasificación
  id          serial primary key,
  tipo_regla  text not null,                 -- 'UBIC_VIRTUAL' | 'COD_ACTIVIDAD' | 'PANTALLA'
  clave       text not null,                 -- 'XX-SIN-UBIC-00', '17', ...
  tipo        text,                          -- CONTEO CICLICO | AJUSTE LPN
  motivo_op   text,                          -- AJUSTE SIN UBICACION, VAS, SHORTPICK...
  unique (tipo_regla, clave)
);

-- ---------------------------------------------------------------------
-- 1. CARGAS (trazabilidad de cada archivo subido)
-- ---------------------------------------------------------------------
create table carga (
  id          uuid primary key default gen_random_uuid(),
  sitio_id    text references sitio(id) default 'CD11',
  fuente      text not null,                 -- ERU | SHORTPICK | REABASTO | MERMA | PROCESOS | INCIDENCIAS
  archivo     text,
  filas       int,
  cargado_por text,
  cargado_en  timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 2. BOLSA (ajustes de inventario: ERU + shortpick + manuales)
-- ---------------------------------------------------------------------
create table ajuste (
  id               bigserial primary key,
  carga_id         uuid references carga(id) on delete cascade,
  sitio_id         text references sitio(id) default 'CD11',
  fuente           text not null,            -- ERU | SHORTPICK | MANUAL
  cod_actividad    int,                      -- 17, 19, 29, 52, 53, 4
  historial        text,                     -- texto original de la actividad
  nro_grupo        text,
  cod_alternat     text references producto(cod_alternat),
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
  tipo             text,                     -- CONTEO CICLICO | AJUSTE LPN
  motivo_op        text,                     -- AJUSTE ACTIVO, AJUSTE RESERVA LPN, SHORTPICK, VAS...
  monto_manual     numeric(14,2),            -- solo fuente MANUAL
  unique (nro_grupo, cod_alternat, fecha, un_ajuste, ubicacion)
);
create index on ajuste (fecha);
create index on ajuste (cod_alternat);
create index on ajuste (nro_grupo);

create table no_considerar (                 -- exclusiones (cruces, siembra, creación otro CD...)
  id          bigserial primary key,
  nro_grupo   text not null,
  cod_alternat text,                         -- null = todo el grupo
  motivo      text not null,                 -- CRUCE | AJUSTE SIEMBRA | CREACION SUIZO | REVERSA MANUAL AUDITOR | EXCLUIDO EN CIERRE
  comentario  text,
  registrado_por text,
  registrado_en date default current_date,
  unique (nro_grupo, cod_alternat)
);

create table cruce (                         -- POSIBLES CRUCES
  id            bigserial primary key,
  grupo_falt    text, sku_falt text, un_falt numeric, val_falt numeric, ubic_falt text, fecha_falt date,
  grupo_sob     text, sku_sob  text, un_sob  numeric, val_sob  numeric, ubic_sob  text, fecha_sob  date,
  coincidencia  text,                        -- UNIDADES IGUALES | MISMAS CAJAS
  cercania      text,
  puntaje       numeric,
  impacto       numeric(14,2),               -- mejora de la bolsa si se confirma
  decision      text default 'Pendiente',    -- Pendiente | Confirmado | Descartado
  comentario    text,
  pasado_nc     boolean default false,
  unique (grupo_falt, sku_falt, grupo_sob, sku_sob)
);

-- Vista principal: ajuste valorizado y clasificado
create or replace view v_ajuste as
select a.*,
       p.descripcion, p.proveedor, p.familia, p.clase_picking,
       case when a.fuente = 'MANUAL' then a.monto_manual
            else coalesce(p.costo_unitario,0) * a.un_ajuste end            as valor,
       (p.costo_unitario is null and a.fuente <> 'MANUAL')                 as sin_costo,
       u.area_id, ar.nombre                                                 as area_nombre,
       coalesce(nc.motivo, nc2.motivo)                                      as motivo_auditor,
       case when coalesce(nc.motivo, nc2.motivo) is not null
              or a.motivo_op in ('AJUSTE SIEMBRA','CREA LPN MULTISKU','CREA LPN CARTONES')
            then 'NO CONSIDERAR' else 'CONSIDERAR' end                      as gestion,
       date_trunc('month', a.fecha)::date                                   as mes,
       'Q' || extract(quarter from a.fecha)                                 as trimestre,
       to_char(a.fecha, 'IYYY-"S"IW')                                       as semana
from ajuste a
left join producto p        on p.cod_alternat = a.cod_alternat
left join ubicacion u       on u.codigo = a.ubicacion
left join area ar           on ar.id = u.area_id
left join no_considerar nc  on nc.nro_grupo = a.nro_grupo and nc.cod_alternat = a.cod_alternat
left join no_considerar nc2 on nc2.nro_grupo = a.nro_grupo and nc2.cod_alternat is null;

-- ---------------------------------------------------------------------
-- 3. ERU / ERI (exactitud de ubicaciones por conteo cíclico)
-- ---------------------------------------------------------------------
create table conteo_ciclico (
  id          bigserial primary key,
  carga_id    uuid references carga(id) on delete cascade,
  fecha       date not null,
  ubicacion   text,
  cod_alternat text,
  contada     boolean,                       -- se contó
  con_error   boolean,                       -- hubo ajuste
  faltante    numeric, sobrante numeric
);
create or replace view v_eru as
select date_trunc('month', c.fecha)::date mes, ar.nombre area,
       count(*) filter (where contada) contadas,
       count(*) filter (where contada and not con_error) correctas,
       round(100.0 * count(*) filter (where contada and not con_error)
             / nullif(count(*) filter (where contada),0), 1) eru_pct
from conteo_ciclico c
left join ubicacion u on u.codigo = c.ubicacion
left join area ar on ar.id = u.area_id
group by 1,2;

-- ---------------------------------------------------------------------
-- 4. VAS (auditoría de cartones) -> sale de ajuste con motivo_op = 'VAS'
-- ---------------------------------------------------------------------
create or replace view v_vas as
select * from v_ajuste where motivo_op in ('VAS','CREA LPN VAS');

-- ---------------------------------------------------------------------
-- 5. MERMA
-- ---------------------------------------------------------------------
create table merma (
  id           bigserial primary key,
  carga_id     uuid references carga(id) on delete cascade,
  fecha        date not null,
  area         text,
  cod_alternat text,
  descripcion  text,
  familia      text,
  motivo       text,                         -- avería, vencido, etc.
  unidades     numeric,
  valor        numeric(14,2)
);

-- ---------------------------------------------------------------------
-- 6. PROCESOS PENDIENTES (perdidos, sin ubicación, otros) con trazabilidad
-- ---------------------------------------------------------------------
create table lpn_pendiente (
  id                bigserial primary key,
  nro_lpn           text not null,
  proceso           text not null,           -- Perdido ERU | Sin ubicación | Pendiente de operaciones...
  cod_alternat      text,
  unidades          numeric,
  valor             numeric(14,2),
  fecha_creacion    timestamptz,
  fecha_ingreso     date default current_date,-- entró a gestión
  ubicacion_actual  text,
  area              text,
  supervisor        text,
  responsable       text,
  dni_causo         text,                    -- usuario que lo CAUSÓ
  fecha_levantamiento date,
  dni_levanto       text,                    -- quien lo RECUPERÓ / levantó
  accion            text,
  estado            text generated always as
                    (case when fecha_levantamiento is not null then 'LEVANTADO' else 'PENDIENTE' end) stored,
  unique (nro_lpn, proceso)
);
create or replace view v_lpn_pendiente as
select *, coalesce(fecha_levantamiento, current_date) - fecha_creacion::date as dias_demora,
       case when coalesce(fecha_levantamiento, current_date) - fecha_creacion::date <= 2  then '1. 0-2 días'
            when coalesce(fecha_levantamiento, current_date) - fecha_creacion::date <= 7  then '2. 3-7 días'
            when coalesce(fecha_levantamiento, current_date) - fecha_creacion::date <= 15 then '3. 8-15 días'
            when coalesce(fecha_levantamiento, current_date) - fecha_creacion::date <= 30 then '4. 16-30 días'
            else '5. Más de 30 días' end as tramo
from lpn_pendiente;

-- ---------------------------------------------------------------------
-- 7. REABASTECIMIENTO + AUDITORÍA
-- ---------------------------------------------------------------------
create table tarea_reabasto (
  clave         text primary key,            -- Tarea|LPN|Cod|UbicDestino
  carga_id      uuid references carga(id) on delete cascade,
  fecha         timestamptz not null,
  turno         text,                        -- Mañana 7-15 | Tarde 15-23 | Noche
  nro_tarea     text, nro_orden text,
  tipo_asignac  text,                        -- REAB-CONSOL-CAJA, ...
  estado        text,                        -- Finalizada | Cancelado
  cod_alternat  text, descripcion text,
  cantidad      numeric,
  nro_lpn       text, lote text, fecha_venc date,
  ubic_destino  text, area text,
  usuario       text
);

create table auditoria_reabasto (
  id            bigserial primary key,
  clave         text references tarea_reabasto(clave),
  motivo_seleccion text,                     -- CANCELADA | CONSOLIDACIÓN | ALEATORIA
  fecha_auditoria date,
  dni_auditor   text references auditor(dni),
  p1_ubic_correcta  text check (p1_ubic_correcta in ('Sí','No','N.A.')),
  p2_sin_mezcla     text check (p2_sin_mezcla     in ('Sí','No','N.A.')),
  p3_cant_cuadra    text check (p3_cant_cuadra    in ('Sí','No','N.A.')),
  cant_contada      numeric,
  p4_lote           text check (p4_lote           in ('Sí','No','N.A.')),
  p5_fefo           text check (p5_fefo           in ('Sí','No','N.A.')),
  p6_pasillo_limpio text check (p6_pasillo_limpio in ('Sí','No','N.A.')),
  hallazgo      text,
  comentario    text,
  unique (clave)
);
create or replace view v_auditoria_reabasto as
select a.*, t.fecha, t.area, t.usuario, t.turno,
  (select count(*) from unnest(array[p1_ubic_correcta,p2_sin_mezcla,p3_cant_cuadra,p4_lote,p5_fefo,p6_pasillo_limpio]) x where x in ('Sí','No')) evaluados,
  (select count(*) from unnest(array[p1_ubic_correcta,p2_sin_mezcla,p3_cant_cuadra,p4_lote,p5_fefo,p6_pasillo_limpio]) x where x = 'Sí') cumplen
from auditoria_reabasto a join tarea_reabasto t using (clave);

-- ---------------------------------------------------------------------
-- 8. AUDITORÍA 5S
-- ---------------------------------------------------------------------
create table auditoria_5s (
  id          bigserial primary key,
  fecha       date not null,
  dni_auditor text, nombre_auditor text,
  area        text, ubicacion text, turno text, supervisor text,
  respuestas  jsonb not null,                -- {"1.1":"Cumple","2.3":"No cumple",...}
  pct_s1 numeric, pct_s2 numeric, pct_s3 numeric, pct_s4 numeric, pct_s5 numeric,
  pct_total   numeric,
  nivel       text,                          -- EXCELENTE >=85 | BUENO >=70 | REGULAR >=50 | DEFICIENTE
  hallazgos   text, accion_correctiva text, fotos text[],
  creado_en   timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 9. INCIDENCIAS (reporte de supervisores con fotos)
-- ---------------------------------------------------------------------
create table incidencia (
  id            bigserial primary key,
  fecha         date not null,
  dni           text, nombre text, area text, turno text,
  tipo          text, proceso text,
  cod_alternat  text, descripcion text,
  ubic_asignada text, unidad text, cantidad numeric, lpn text,
  ubicado       boolean, ubic_encontrada text,
  devuelto      boolean,
  comentarios   text,
  fotos         text[],                      -- rutas en Supabase Storage
  creado_en     timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 10. SEGUIMIENTO OPERATIVO (recepción, almacenamiento, reabasto, picking, despacho)
-- ---------------------------------------------------------------------
create table kpi_operativo (
  id          bigserial primary key,
  sitio_id    text references sitio(id) default 'CD11',
  fecha       date not null,
  proceso     text not null check (proceso in ('RECEPCION','ALMACENAMIENTO','REABASTECIMIENTO','PICKING','DESPACHO','INVENTARIO','PRODUCCION')),
  area        text,
  turno       text,
  indicador   text not null,                 -- unidades, lineas, productividad, OTIF, backlog...
  valor       numeric,
  meta        numeric,
  unique (sitio_id, fecha, proceso, area, turno, indicador)
);

-- ---------------------------------------------------------------------
-- Seguridad básica (ajustar roles luego)
-- ---------------------------------------------------------------------
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname='public' loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "lectura autenticados" on %I for select to authenticated using (true)', t);
    execute format('create policy "escritura autenticados" on %I for all to authenticated using (true) with check (true)', t);
  end loop; end $$;

insert into sitio values ('CD11','Centro de Distribución 11','CD',true);
