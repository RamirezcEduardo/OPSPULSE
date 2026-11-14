-- =====================================================================
-- Validación móvil de reabasto: producto en ubicación + cantidad + foto
-- OK → CONFORME · cualquier "No" → PENDIENTE con usuario responsable
-- =====================================================================
alter table auditoria_reabasto
  add column if not exists producto_en_ubic   boolean,
  add column if not exists cantidad_completa  boolean,
  add column if not exists cant_encontrada    numeric,
  add column if not exists usuario_responsable text,
  add column if not exists fotos              text[],
  add column if not exists validado_en        timestamptz,
  add column if not exists levantado_en       timestamptz,
  add column if not exists levantado_por      uuid references auth.users(id);

-- Estado de validación calculado
create or replace view v_validacion_reabasto with (security_invoker = true) as
select a.*, t.fecha, t.turno, t.nro_tarea, t.tipo_asignac, t.estado as estado_tarea, t.cod_alternat, t.descripcion,
  t.cantidad, t.nro_lpn, t.lote, t.ubic_destino, t.area, t.usuario as usuario_tarea,
  (t.fecha at time zone 'America/Lima')::date as dia,
  case when a.validado_en is null                                   then 'SIN VALIDAR'
       when a.producto_en_ubic and a.cantidad_completa              then 'CONFORME'
       when a.levantado_en is not null                              then 'LEVANTADA'
       else 'PENDIENTE' end                                          as validacion
from auditoria_reabasto a
join tarea_reabasto t using (clave);

-- Incidencias acumuladas por usuario responsable
create or replace view v_incidencias_reabasto_usuario with (security_invoker = true) as
select usuario_responsable, count(*) as incidencias,
       count(*) filter (where levantado_en is null) as abiertas,
       min(dia) as primera, max(dia) as ultima
from v_validacion_reabasto
where validacion in ('PENDIENTE','LEVANTADA') and usuario_responsable is not null
group by 1;

-- Fotos: carpeta reabasto/ dentro del bucket privado "fotos" (políticas ya existen)
