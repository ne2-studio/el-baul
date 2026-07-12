
-- Crear tabla de recuerdos asociados a fotos
create table if not exists public.recuerdos (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid references public.photos(id) on delete cascade not null,
  user_id uuid references public.users(id) not null,
  text text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS
alter table public.recuerdos enable row level security;

-- Políticas de RLS para Recuerdos
create policy "Users can view recuerdos if they can view the photo"
  on public.recuerdos for select
  using (
    exists (
      select 1 from public.photos
      where photos.id = recuerdos.photo_id
    )
  );

create policy "Users can create recuerdos if they have access to the baul"
  on public.recuerdos for insert
  with check (
    exists (
      select 1 from public.photos
      join public.baules on baules.id = photos.baul_id
      where photos.id = recuerdos.photo_id
      and (
        baules.custodio_id = auth.uid()
        or exists (
          select 1 from public.shared_users
          where shared_users.baul_id = baules.id
          and shared_users.user_id = auth.uid()
        )
      )
    )
  );

-- Only creators can delete/update their own recuerdos (optional, but good practice)
create policy "Users can delete their own recuerdos"
  on public.recuerdos for delete
  using (auth.uid() = user_id);

create policy "Users can update their own recuerdos"
  on public.recuerdos for update
  using (auth.uid() = user_id);
