
-- Crear tabla de actividades
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  baul_id uuid references public.baules(id) on delete cascade not null,
  baul_name text not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  is_actionable boolean default false not null,
  photo_count integer,
  requester_email text,
  access_request_id uuid,
  removal_request_id uuid
);

-- Habilitar RLS
alter table public.activities enable row level security;

-- Políticas de RLS para Actividades
create policy "Users can view activities if they have access to the baul"
  on public.activities for select
  using (
    exists (
      select 1 from public.baules
      where baules.id = activities.baul_id
    )
  );

-- Usualmente las actividades se crean desde el sistema, pero si se hiciera desde el cliente:
create policy "Authorized users can create activities"
  on public.activities for insert
  with check (
    exists (
      select 1 from public.baules
      where baules.id = activities.baul_id
      and (
        baules.custodio_id = auth.uid() or
        exists (
          select 1 from public.shared_users
          where shared_users.baul_id = activities.baul_id
          and shared_users.user_id = auth.uid()
          and shared_users.role in ('colaborador', 'custodio')
        )
      )
    )
  );
