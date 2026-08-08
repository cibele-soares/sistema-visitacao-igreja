-- Adiciona o campo "idade" para voluntários (cadastro direto e solicitações pendentes)
-- Execute este script no Supabase → SQL Editor (ou via supabase db push)

ALTER TABLE public.voluntarios
  ADD COLUMN IF NOT EXISTS idade smallint;

ALTER TABLE public.voluntarios_pendentes
  ADD COLUMN IF NOT EXISTS idade smallint;

ALTER TABLE public.voluntarios
  ADD CONSTRAINT voluntarios_idade_check CHECK (idade IS NULL OR (idade > 0 AND idade < 120));

ALTER TABLE public.voluntarios_pendentes
  ADD CONSTRAINT voluntarios_pendentes_idade_check CHECK (idade IS NULL OR (idade > 0 AND idade < 120));

-- A função de aprovação precisa copiar idade do pendente para o voluntário final
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

  insert into public.voluntarios (nome, telefone, disponibilidade, eh_lider, codigo, casa_oracao, possui_carro, idade)
  values (v_pendente.nome, v_pendente.telefone, v_pendente.disponibilidade, false, upper(trim(p_codigo)), v_pendente.casa_oracao, v_pendente.possui_carro, v_pendente.idade)
  returning * into v_voluntario;
  delete from public.voluntarios_pendentes where id = p_id;
  return v_voluntario;
end $$;

revoke all on function public.aprovar_voluntario_pendente(uuid,text) from public;
grant execute on function public.aprovar_voluntario_pendente(uuid,text) to authenticated;
