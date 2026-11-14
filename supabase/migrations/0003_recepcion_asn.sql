-- =====================================================================
-- Auditoría de recepción · ASN (export WMS "IBShipment", 1 fila por ASN)
-- =====================================================================

alter table carga drop constraint if exists carga_fuente_check;
alter table carga add constraint carga_fuente_check check (fuente in
  ('ERU','SHORTPICK','MANUAL','VALOR','UBICACIONES','PRODUCTOS','USUARIOS','MOTIVOS',
   'REABASTO','MERMA','PROCESOS','INCIDENCIAS','CONTEO','ASN'));

-- 1) Estado ACTUAL de cada ASN (se actualiza en cada carga; clave = Nro ASN)
create table asn (
  nro_asn            text primary key,
  sitio_id           text references sitio(id) default 'CD11',
  estado             text not null,              -- Verificado | En tránsito | Recibiendo | ...
  tipo_asn           text,                       -- SHIPTO | ESP | TQE | PCN | ECO
  proveedor          text,                       -- Nombre de proveedor o, si viene vacío, Información de proveedor
  nro_carga          text,
  nro_cita           text,
  placa              text,
  numero_guia        text,
  ordenes_compra     text,
  lpn_enviadas       int,
  lpn_recibidas      int,
  un_enviadas        numeric,
  un_recibidas       numeric,
  pct_recepcion      numeric,
  nro_articulos      int,
  fecha_creacion     timestamptz,
  fecha_envio        date,
  primera_lpn_en     timestamptz,
  ultima_lpn_en      timestamptz,
  verificado_en      timestamptz,
  usuario_modif      text,
  extra              jsonb,                      -- resto de columnas del WMS (custom 1-5, etc.)
  primera_carga_id   uuid references carga(id) on delete set null,
  ultima_carga_id    uuid references carga(id) on delete set null,
  visto_primera_vez  timestamptz default now(),
  actualizado_en     timestamptz default now()
);
create index on asn (fecha_creacion);
create index on asn (estado);
create index on asn (proveedor);

-- 2) Historial: foto de la ASN en cada carga (permite ver cuándo cambió de estado)
create table asn_historial (
  id            bigserial primary key,
  carga_id      uuid references carga(id) on delete cascade,
  nro_asn       text not null references asn(nro_asn) on delete cascade,
  estado        text,
  un_recibidas  numeric,
  lpn_recibidas int,
  pct_recepcion numeric,
  capturado_en  timestamptz default now(),
  unique (carga_id, nro_asn)
);

-- 3) Gestión de diferencias (lo registra el auditor)
create table asn_gestion (
  nro_asn        text primary key references asn(nro_asn) on delete cascade,
  causa          text check (causa in ('ERROR PROVEEDOR','ERROR CONTEO','AVERIA','FALTANTE EN TRANSPORTE','LPN CONSOLIDADO','OTRO')),
  accion         text,
  estado_gestion text not null default 'ABIERTA' check (estado_gestion in ('ABIERTA','EN PROCESO','CERRADA')),
  dni_auditor    text,
  comentario     text,
  cerrado_en     date,
  actualizado_por uuid references auth.users(id) default auth.uid(),
  actualizado_en timestamptz default now()
);

-- Vista con la clasificación, diferencias valorizadas y tiempos
create or replace view v_asn with (security_invoker = true) as
select a.*,
  coalesce(a.un_recibidas,0) - coalesce(a.un_enviadas,0)                as dif_unidades,
  coalesce(a.lpn_recibidas,0) - coalesce(a.lpn_enviadas,0)              as dif_lpn,
  case
    when a.estado <> 'Verificado'                                        then 'PENDIENTE'
    when coalesce(a.un_recibidas,0) <> coalesce(a.un_enviadas,0)         then 'CON DIFERENCIA'
    when coalesce(a.lpn_recibidas,0) <> coalesce(a.lpn_enviadas,0)       then 'LPN CONSOLIDADO'
    else 'CONFORME' end                                                  as resultado,
  round(extract(epoch from (a.primera_lpn_en - a.fecha_creacion))/60)   as min_creacion_a_recepcion,
  round(extract(epoch from (a.ultima_lpn_en  - a.primera_lpn_en))/60)   as min_recepcion,
  round(extract(epoch from (a.verificado_en  - a.ultima_lpn_en))/60)    as min_hasta_verificar,
  case when a.estado <> 'Verificado'
       then round(extract(epoch from (now() - a.fecha_creacion))/3600, 1) end as horas_pendiente,
  (a.fecha_creacion at time zone 'America/Lima')::date                  as dia,
  case when extract(hour from a.primera_lpn_en at time zone 'America/Lima') >= 7
             and extract(hour from a.primera_lpn_en at time zone 'America/Lima') < 15 then 'Mañana'
       when extract(hour from a.primera_lpn_en at time zone 'America/Lima') >= 15
             and extract(hour from a.primera_lpn_en at time zone 'America/Lima') < 23 then 'Tarde'
       when a.primera_lpn_en is not null then 'Noche' end              as turno,
  g.causa, g.accion, g.estado_gestion, g.comentario as comentario_gestion
from asn a
left join asn_gestion g using (nro_asn);

-- RLS: todos leen; admin carga; auditor/supervisor gestionan diferencias
do $$ declare t text; begin
  foreach t in array array['asn','asn_historial','asn_gestion'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "lectura" on %I for select to authenticated using (true)', t);
    execute format('create policy "admin escribe" on %I for all to authenticated using (tiene_rol(''admin'')) with check (tiene_rol(''admin''))', t);
  end loop; end $$;
create policy "auditor gestiona" on asn_gestion for all to authenticated
  using (tiene_rol('auditor','supervisor')) with check (tiene_rol('auditor','supervisor'));
