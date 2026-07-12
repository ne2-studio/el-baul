
-- Mejorar las políticas de RLS para shared_users para manejar mejor a los usuarios invitados por email
-- que aún no tienen un user_id asociado.

-- Borrar políticas antiguas si es necesario para evitar conflictos
drop policy if exists "Shared users can view baules" on public.baules;
drop policy if exists "Users can view their own shares" on public.shared_users;

-- Nueva política para que usuarios invitados puedan ver el baúl basándose en su email de la invitación
create policy "Shared users can view baules"
  on public.baules for select
  using (
    exists (
      select 1 from public.shared_users
      where shared_users.baul_id = baules.id
      and (
        shared_users.user_id = auth.uid() 
        or 
        shared_users.email = (select email from auth.users where id = auth.uid())
      )
    )
  );

-- Nueva política para que los usuarios vean sus propias participaciones/invitaciones
create policy "Users can view their own shares"
  on public.shared_users for select
  using ( 
    user_id = auth.uid() 
    or 
    email = (select email from auth.users where id = auth.uid())
  );
