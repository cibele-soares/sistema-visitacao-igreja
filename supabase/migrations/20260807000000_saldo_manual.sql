-- Saldo do Mercado Pago informado manualmente (a API de saldo em tempo
-- real não está disponível publicamente para consulta via token comum).

create table if not exists public.configuracoes_financeiras (
  id boolean primary key default true,
  saldo_mercado_pago numeric(12,2) not null default 0,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users(id),
  constraint configuracoes_financeiras_singleton check (id)
);

insert into public.configuracoes_financeiras (id) values (true)
  on conflict (id) do nothing;

alter table public.configuracoes_financeiras enable row level security;

drop policy if exists "admin_le_configuracoes_financeiras" on public.configuracoes_financeiras;
create policy "admin_le_configuracoes_financeiras"
  on public.configuracoes_financeiras for select
  to authenticated
  using (public.is_admin());

create or replace function public.definir_saldo_mercado_pago(p_valor numeric)
returns public.configuracoes_financeiras
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.configuracoes_financeiras;
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  if p_valor is null or p_valor < 0 then raise exception 'Valor inválido'; end if;

  update public.configuracoes_financeiras
     set saldo_mercado_pago = p_valor,
         atualizado_em = now(),
         atualizado_por = auth.uid()
   where id = true
   returning * into v_row;

  return v_row;
end $$;

revoke all on function public.definir_saldo_mercado_pago(numeric) from public;
grant execute on function public.definir_saldo_mercado_pago(numeric) to authenticated;