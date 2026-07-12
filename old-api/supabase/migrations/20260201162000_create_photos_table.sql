
-- Crear tabla de fotos
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid references public.albums(id) on delete cascade not null,
  baul_id uuid references public.baules(id) on delete cascade not null,
  url text not null,
  caption text,
  date timestamp with time zone not null,
  uploaded_by uuid references public.users(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS
alter table public.photos enable row level security;

-- Políticas de RLS para Fotos
create policy "Users can view photos if they have access to the baul"
  on public.photos for select
  using (
    exists (
      select 1 from public.baules
      where baules.id = photos.baul_id
    )
  );

create policy "Custodians can manage photos"
  on public.photos for all
  using (
    exists (
      select 1 from public.baules
      where baules.id = photos.baul_id
      and baules.custodio_id = auth.uid()
    )
  );

create policy "Collaborators can manage photos"
  on public.photos for all
  using (
    exists (
      select 1 from public.shared_users
      where shared_users.baul_id = photos.baul_id
      and shared_users.user_id = auth.uid()
      and shared_users.role in ('colaborador', 'custodio')
    )
  );
