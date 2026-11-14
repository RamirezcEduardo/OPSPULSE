-- =====================================================================
-- Seguimiento + auditoría de reabasto (export WMS "Asignación", bandera = No)
-- =====================================================================
alter table tarea_reabasto drop constraint if exists tarea_reabasto_estado_check;
alter table tarea_reabasto
  add column if not exists estado_asignacion text,
  add column if not exists fecha_modif       timestamptz,
  add column if not exists fecha_prioritaria text,
  add column if not exists ubic_origen       text,
  add column if not exists ubic_activo       text,
  add column if not exists nro_carton        text,
  add column if not exists tipo_lpn          text,
  add column if not exists usuario_pick      text,
  add column if not exists usuario_creado    text,
  add column if not exists ultima_carga_id   uuid references carga(id) on delete set null,
  add column if not exists visto_ultima_carga boolean not null default true,
  add column if not exists actualizado_en    timestamptz default now();
create index if not exists tarea_reabasto_estado_idx on tarea_reabasto (estado);

alter table auditoria_reabasto drop constraint if exists auditoria_reabasto_dni_auditor_fkey;
alter table auditoria_reabasto
  add column if not exists hallazgo_principal text,
  add column if not exists auditado_por uuid references auth.users(id) default auth.uid(),
  add column if not exists auditado_en  timestamptz;

insert into parametro values
  ('hallazgos_reabasto', '["Conforme","Producto no encontrado en destino","Mezcla de SKU","Diferencia de cantidad","Lote errado","No respeta FEFO","LPN / paleta abandonada en pasillo","Producto de tarea cancelada sin ubicar","Otro"]')
on conflict (clave) do nothing;

alter table carga drop constraint if exists carga_fuente_check;
alter table carga add constraint carga_fuente_check check (fuente in
  ('ERU','SHORTPICK','MANUAL','VALOR','UBICACIONES','PRODUCTOS','USUARIOS','MOTIVOS',
   'REABASTO','MERMA','PROCESOS','INCIDENCIAS','CONTEO','ASN'));

create or replace view v_tarea_reabasto with (security_invoker = true) as
select t.*,
  case when t.estado ilike 'final%' then 'FINALIZADA'
       when t.estado ilike 'cancel%' then 'CANCELADA'
       else 'PENDIENTE' end                                              as seguimiento,
  case when not (t.estado ilike 'final%' or t.estado ilike 'cancel%')
       then round(extract(epoch from (now() - t.fecha))/3600, 1) end    as horas_pendiente,
  (t.fecha at time zone 'America/Lima')::date                            as dia,
  a.motivo_seleccion, a.fecha_auditoria, a.dni_auditor,
  a.p1_ubic_correcta, a.p2_sin_mezcla, a.p3_cant_cuadra, a.cant_contada, a.p4_lote, a.p5_fefo, a.p6_pasillo_limpio,
  a.hallazgo_principal, a.comentario as comentario_auditoria,
  r.evaluados, r.cumplen, r.resultado
from tarea_reabasto t
left join auditoria_reabasto a using (clave)
left join v_auditoria_reabasto r using (clave);

-- auditor/supervisor pueden registrar la auditoría (insert/update), lectura para todos ya existe
drop policy if exists "auditor reabasto" on auditoria_reabasto;
create policy "auditor reabasto" on auditoria_reabasto for all to authenticated
  using (tiene_rol('auditor','supervisor','admin')) with check (tiene_rol('auditor','supervisor','admin'));
