-- Cria a tabela de presença dos voluntários por data de evento
-- Execute este script no Supabase → SQL Editor (ou via supabase db push)

create table if not exists public.presencas (
  id uuid primary key default gen_random_uuid(),
  voluntario_id uuid not null references public.voluntarios(id) on delete cascade,
  data date not null,
  presente boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (voluntario_id, data)
);

alter table public.presencas enable row level security;

create policy admin_presencas on public.presencas for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke all on public.presencas from anon;
