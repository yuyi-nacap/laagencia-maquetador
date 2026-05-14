-- ============================================================
-- LaAgencia x Navarra Capital · Maquetador editorial
-- Migración inicial: tabla documents + RLS + bucket logos
-- Ejecuta este SQL en el SQL Editor de Supabase tras crear el proyecto.
-- ============================================================

-- 1. Tabla principal de documentos
create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null default 'Sin título',
  doc_type    text not null check (doc_type in ('proposal','report')),
  orientation text not null check (orientation in ('landscape','portrait')),
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists documents_user_id_idx on public.documents(user_id);
create index if not exists documents_updated_at_idx on public.documents(updated_at desc);

-- 2. Trigger para mantener updated_at
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

-- 3. Row Level Security: cada usuario sólo ve y modifica sus propios documentos
alter table public.documents enable row level security;

drop policy if exists "documents_select_own" on public.documents;
create policy "documents_select_own" on public.documents
  for select using (auth.uid() = user_id);

drop policy if exists "documents_insert_own" on public.documents;
create policy "documents_insert_own" on public.documents
  for insert with check (auth.uid() = user_id);

drop policy if exists "documents_update_own" on public.documents;
create policy "documents_update_own" on public.documents
  for update using (auth.uid() = user_id);

drop policy if exists "documents_delete_own" on public.documents;
create policy "documents_delete_own" on public.documents
  for delete using (auth.uid() = user_id);

-- 4. Bucket de almacenamiento para logos de cliente
-- Nota: en Supabase moderno los buckets se crean desde Storage UI, pero esto lo deja registrado
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Política: los usuarios autenticados pueden subir logos en su propia carpeta {user_id}/...
drop policy if exists "logos_insert_own" on storage.objects;
create policy "logos_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "logos_select_public" on storage.objects;
create policy "logos_select_public" on storage.objects
  for select to public
  using (bucket_id = 'logos');

drop policy if exists "logos_delete_own" on storage.objects;
create policy "logos_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
