-- Trigger para crear perfil de usuario automáticamente al registrarse en Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', 'Usuario')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Borrar el trigger si ya existe para evitar errores en recreación
drop trigger if exists on_auth_user_created on auth.users;

-- Crear el trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
