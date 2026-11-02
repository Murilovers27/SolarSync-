alter table public.usuario
  add column if not exists carga_total_w integer not null default 400;

create unique index if not exists usuario_auth_user_id_uidx
  on public.usuario (auth_user_id);

alter table public.usuario enable row level security;
alter table public.carros enable row level security;

grant select, update on table public.usuario to authenticated;
grant select, insert, delete on table public.carros to authenticated;
grant usage, select on all sequences in schema public to authenticated;

drop policy if exists "usuario_select_own" on public.usuario;
create policy "usuario_select_own"
  on public.usuario for select
  to authenticated
  using ((select auth.uid()) = auth_user_id);

drop policy if exists "usuario_update_own" on public.usuario;
create policy "usuario_update_own"
  on public.usuario for update
  to authenticated
  using ((select auth.uid()) = auth_user_id)
  with check ((select auth.uid()) = auth_user_id);

drop policy if exists "carros_select_own" on public.carros;
create policy "carros_select_own"
  on public.carros for select
  to authenticated
  using (
    exists (
      select 1 from public.usuario
      where usuario.id = carros.usuario_id
        and usuario.auth_user_id = (select auth.uid())
    )
  );

drop policy if exists "carros_insert_own" on public.carros;
create policy "carros_insert_own"
  on public.carros for insert
  to authenticated
  with check (
    exists (
      select 1 from public.usuario
      where usuario.id = carros.usuario_id
        and usuario.auth_user_id = (select auth.uid())
    )
  );

drop policy if exists "carros_delete_own" on public.carros;
create policy "carros_delete_own"
  on public.carros for delete
  to authenticated
  using (
    exists (
      select 1 from public.usuario
      where usuario.id = carros.usuario_id
        and usuario.auth_user_id = (select auth.uid())
    )
  );

create or replace function public.criar_perfil_usuario()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.usuario (auth_user_id, nome, email, carro)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1)),
    new.email,
    null
  )
  on conflict (auth_user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists criar_perfil_usuario_apos_cadastro on auth.users;

create trigger criar_perfil_usuario_apos_cadastro
  after insert on auth.users
  for each row
  execute function public.criar_perfil_usuario();

insert into public.usuario (auth_user_id, nome, email, carro)
select
  users.id,
  coalesce(nullif(trim(users.raw_user_meta_data ->> 'nome'), ''), split_part(users.email, '@', 1)),
  users.email,
  null
from auth.users as users
where not exists (
  select 1
  from public.usuario as profiles
  where profiles.auth_user_id = users.id
);
