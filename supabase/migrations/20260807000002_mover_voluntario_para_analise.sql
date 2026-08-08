create or replace function public.mover_voluntario_para_analise(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_voluntario public.voluntarios;
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  select * into v_voluntario from public.voluntarios where id = p_id for update;
  if not found then raise exception 'Voluntário não encontrado'; end if;

  insert into public.voluntarios_pendentes (nome, telefone, disponibilidade, casa_oracao, possui_carro, idade, status)
  values (v_voluntario.nome, v_voluntario.telefone, v_voluntario.disponibilidade, v_voluntario.casa_oracao, v_voluntario.possui_carro, v_voluntario.idade, 'recusado');

  delete from public.voluntarios where id = p_id;
end $$;

revoke all on function public.mover_voluntario_para_analise(uuid) from public;
grant execute on function public.mover_voluntario_para_analise(uuid) to authenticated;