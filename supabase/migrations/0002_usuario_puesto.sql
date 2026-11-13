-- Login por usuario (no por correo) y puesto del colaborador
alter table perfil add column usuario text unique;
alter table perfil add column puesto text;

create or replace function public.crear_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into perfil (id, nombre, usuario, dni, puesto)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
          split_part(new.email, '@', 1),
          new.raw_user_meta_data->>'dni',
          new.raw_user_meta_data->>'puesto');
  return new;
end $$;
