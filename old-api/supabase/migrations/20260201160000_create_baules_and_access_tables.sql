
-- Crear tabla de baúles
create table if not exists public.baules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  custodio_id uuid references public.users(id) not null,
  custodio_email text not null,
  album_count integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS
alter table public.baules enable row level security;

-- Políticas de RLS para Baúles
-- El custodio tiene acceso total
create policy "Custodians have full access to their baules"
  on public.baules for all
  using ( auth.uid() = custodio_id );

-- Tablas de gestión de accesos
create table if not exists public.shared_users (
  id uuid default gen_random_uuid() primary key,
  baul_id uuid references public.baules(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade, -- puede ser nulo si es invitación por email pendiente
  email text not null,
  name text,
  role text check (role in ('miembro', 'colaborador', 'custodio')) not null,
  status text check (status in ('pending', 'active')) not null,
  invited_date timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(baul_id, email)
);

alter table public.shared_users enable row level security;

-- Los usuarios compartidos pueden ver el baúl (Política en la tabla baules)
create policy "Shared users can view baules"
  on public.baules for select
  using (
    exists (
      select 1 from public.shared_users
      where shared_users.baul_id = baules.id
      and (shared_users.user_id = auth.uid() or shared_users.email = auth.jwt() ->> 'email')
    )
  );

-- Políticas para shared_users
create policy "Custodians can manage shared users"
  on public.shared_users for all
  using (
    exists (
      select 1 from public.baules
      where baules.id = shared_users.baul_id
      and baules.custodio_id = auth.uid()
    )
  );

create policy "Users can view their own shares"
  on public.shared_users for select
  using ( user_id = auth.uid() or email = auth.jwt() ->> 'email' );

-- Tabla de peticiones de acceso
create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  baul_id uuid references public.baules(id) on delete cascade not null,
  email text not null,
  name text,
  message text,
  request_date timestamp with time zone default timezone('utc'::text, now()) not null,
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending' not null
);

alter table public.access_requests enable row level security;

create policy "Custodians can manage access requests"
  on public.access_requests for all
  using (
    exists (
      select 1 from public.baules
      where baules.id = access_requests.baul_id
      and baules.custodio_id = auth.uid()
    )
  );

create policy "Users can view and create their own access requests"
  on public.access_requests for select
  using ( email = auth.jwt() ->> 'email' );

create policy "Anyone can create an access request"
  on public.access_requests for insert
  with check ( true );

-- Tabla de peticiones de eliminación
create table if not exists public.removal_requests (
  id uuid primary key default gen_random_uuid(),
  baul_id uuid references public.baules(id) on delete cascade not null,
  photo_id uuid not null, -- se referenciará después
  photo_url text not null,
  photo_caption text,
  requester_name text not null,
  requester_email text not null,
  reason text,
  request_date timestamp with time zone default timezone('utc'::text, now()) not null,
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending' not null
);

alter table public.removal_requests enable row level security;

create policy "Custodians can manage removal requests"
  on public.removal_requests for all
  using (
    exists (
      select 1 from public.baules
      where baules.id = removal_requests.baul_id
      and baules.custodio_id = auth.uid()
    )
  );
