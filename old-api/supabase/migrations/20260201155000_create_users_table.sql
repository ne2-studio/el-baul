
-- Crear tabla de usuarios
create table if not exists public.users (
  id uuid references auth.users not null primary key,
  email text not null unique,
  name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS
alter table public.users enable row level security;

-- Políticas de RLS
-- Los usuarios pueden leer su propio perfil
create policy "Users can view own profile"
  on public.users for select
  using ( auth.uid() = id );

-- Los usuarios pueden actualizar su propio perfil
create policy "Users can update own profile"
  on public.users for update
  using ( auth.uid() = id );

-- Permitir la inserción durante el registro (usualmente se hace vía trigger de auth, pero permitimos inserción directa si es necesario)
-- Si la app inserta directamente en la tabla pública al registrarse:
create policy "Users can insert own profile"
  on public.users for insert
  with check ( auth.uid() = id );
