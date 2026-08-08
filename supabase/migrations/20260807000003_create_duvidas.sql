-- Campo de dúvidas na landing page, visível numa página dedicada no admin.

create table if not exists public.duvidas (
  id uuid primary key default gen_random_uuid(),
  nome text not null default '',
  telefone text not null,
  mensagem text not null,
  status text not null default 'pendente',
  created_at timestamptz not null default now()
);

alter table public.duvidas enable row level security;

-- Formulário público: anônimo só pode inserir.
create policy duvida_public_insert on public.duvidas for insert to anon, authenticated
  with check (
    length(trim(mensagem)) between 3 and 3000
    and length(trim(nome)) <= 150
    and length(telefone) <= 30
    and telefone is not null
    and length(trim(telefone)) > 0
  );

create policy duvida_admin on public.duvidas for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke all on table public.duvidas from anon;
grant insert on table public.duvidas to anon, authenticated;
grant select, insert, update, delete on table public.duvidas to authenticated;
