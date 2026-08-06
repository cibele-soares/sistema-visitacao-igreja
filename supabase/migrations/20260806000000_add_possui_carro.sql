-- Adiciona o campo "possui carro" para voluntários (cadastro direto e solicitações pendentes)
-- Execute este script no Supabase → SQL Editor (ou via supabase db push)

ALTER TABLE public.voluntarios
  ADD COLUMN IF NOT EXISTS possui_carro boolean NOT NULL DEFAULT false;

ALTER TABLE public.voluntarios_pendentes
  ADD COLUMN IF NOT EXISTS possui_carro boolean NOT NULL DEFAULT false;

-- A função de aprovação precisa copiar possui_carro do pendente para o voluntário final
create or replace function public.aprovar_voluntario_pendente(p_id uuid, p_codigo text)
returns public.voluntarios
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pendente public.voluntarios_pendentes;
  v_voluntario public.voluntarios;
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  select * into v_pendente from public.voluntarios_pendentes where id = p_id for update;
  if not found then raise exception 'Solicitação não encontrada'; end if;
  if length(trim(p_codigo)) < 8 then raise exception 'Código deve ter pelo menos 8 caracteres'; end if;

  insert into public.voluntarios (nome, telefone, disponibilidade, eh_lider, codigo, casa_oracao, possui_carro)
  values (v_pendente.nome, v_pendente.telefone, v_pendente.disponibilidade, false, upper(trim(p_codigo)), v_pendente.casa_oracao, v_pendente.possui_carro)
  returning * into v_voluntario;
  delete from public.voluntarios_pendentes where id = p_id;
  return v_voluntario;
end $$;

revoke all on function public.aprovar_voluntario_pendente(uuid,text) from public;
grant execute on function public.aprovar_voluntario_pendente(uuid,text) to authenticated;
