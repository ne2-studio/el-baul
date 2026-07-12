
-- Eliminar columna name de shared_users
alter table public.shared_users drop column if exists name;
