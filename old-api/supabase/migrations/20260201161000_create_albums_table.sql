
-- Crear tabla de álbumes
create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  baul_id uuid references public.baules(id) on delete cascade not null,
  name text not null,
  description text,
  photo_count integer default 0 not null,
  cover_photo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS
alter table public.albums enable row level security;

-- Políticas de RLS para Álbumes
-- El acceso a los álbumes está determinado por el acceso al baúl
create policy "Users can view albums if they have access to the baul"
  on public.albums for select
  using (
    exists (
      select 1 from public.baules
      where baules.id = albums.baul_id
    )
  );

create policy "Custodians can manage albums"
  on public.albums for all
  using (
    exists (
      select 1 from public.baules
      where baules.id = albums.baul_id
      and baules.custodio_id = auth.uid()
    )
  );

create policy "Collaborators can manage albums"
  on public.albums for all
  using (
    exists (
      select 1 from public.shared_users
      where shared_users.baul_id = albums.baul_id
      and shared_users.user_id = auth.uid()
      and shared_users.role in ('colaborador', 'custodio')
    )
  );
