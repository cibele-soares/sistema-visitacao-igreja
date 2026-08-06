-- Permite marcar uma visita como "não realizada" (em vez de apenas pendente/realizada)
-- Execute este script no Supabase → SQL Editor

alter table public.visitas
  add column if not exists nao_realizada boolean not null default false;

alter table public.visitas
  add column if not exists motivo_nao_realizada text not null default '';

alter table public.registros_visitas
  add column if not exists nao_realizada boolean not null default false;

-- Admin: marcar visita como não realizada (não mexe no estoque, pois nada foi entregue)
create or replace function public.marcar_visita_nao_realizada(
  p_visita_id uuid,
  p_motivo text
)
returns public.visitas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_visita public.visitas;
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  if coalesce(trim(p_motivo), '') = '' then raise exception 'Informe o motivo da visita não realizada'; end if;

  select * into v_visita from public.visitas where id = p_visita_id for update;
  if not found then raise exception 'Visita não encontrada'; end if;
  if v_visita.realizada then raise exception 'Visita já foi concluída'; end if;

  update public.visitas
     set nao_realizada = true,
         realizada = false,
         data_visita = current_date,
         motivo_nao_realizada = p_motivo
   where id = p_visita_id
   returning * into v_visita;

  insert into public.registros_visitas
    (visita_id, realizada_em, relato, pedido_oracao, nao_realizada, registrado_por)
  values
    (p_visita_id, now(), p_motivo, '', true, auth.uid());

  return v_visita;
end $$;

-- Admin: voltar visita (realizada ou não realizada) para pendente, limpando os campos
create or replace function public.reabrir_visita(p_visita_id uuid)
returns public.visitas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_visita public.visitas;
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;

  update public.visitas
     set realizada = false,
         nao_realizada = false,
         data_visita = null,
         observacoes = '',
         pedido_oracao = '',
         motivo_nao_realizada = ''
   where id = p_visita_id
   returning * into v_visita;

  if not found then raise exception 'Visita não encontrada'; end if;
  return v_visita;
end $$;

-- Voluntário: marcar visita como não realizada
create or replace function public.voluntario_marcar_visita_nao_realizada(
  p_token text,
  p_visita_id uuid,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_voluntario_id uuid;
  v_grupo_id uuid;
  v_realizada boolean;
begin
  if coalesce(trim(p_motivo), '') = '' then raise exception 'Informe o motivo da visita não realizada'; end if;

  select s.voluntario_id into v_voluntario_id
  from public.voluntario_sessoes s
  where s.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and s.expires_at > now();
  if not found then raise exception 'Sessão inválida ou expirada'; end if;

  select grupo_id, realizada into v_grupo_id, v_realizada
  from public.visitas where id = p_visita_id for update;
  if not found then raise exception 'Visita não encontrada'; end if;

  if not (
    exists (select 1 from public.grupo_voluntarios gv where gv.grupo_id = v_grupo_id and gv.voluntario_id = v_voluntario_id)
    or exists (select 1 from public.grupos g where g.id = v_grupo_id and g.lider_id = v_voluntario_id)
  ) then raise exception 'Acesso negado a esta visita'; end if;

  if not v_realizada then
    update public.visitas
       set nao_realizada = true,
           realizada = false,
           data_visita = current_date,
           motivo_nao_realizada = p_motivo
     where id = p_visita_id;

    insert into public.registros_visitas
      (visita_id, realizada_em, relato, pedido_oracao, nao_realizada, registrado_por_voluntario)
    values
      (p_visita_id, now(), p_motivo, '', true, v_voluntario_id);
  end if;

  return public.voluntario_area(p_token);
end $$;

-- Atualiza voluntario_area para expor os novos campos
create or replace function public.voluntario_area(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_voluntario_id uuid;
  v_result jsonb;
begin
  select s.voluntario_id into v_voluntario_id
  from public.voluntario_sessoes s
  where s.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and s.expires_at > now();
  if not found then raise exception 'Sessão inválida ou expirada'; end if;

  update public.voluntario_sessoes
     set last_used_at = now()
   where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');

  select jsonb_build_object(
    'voluntario', (
      select jsonb_build_object(
        'id', v.id, 'nome', v.nome, 'telefone', v.telefone,
        'disponibilidade', v.disponibilidade, 'ehLider', v.eh_lider
      ) from public.voluntarios v where v.id = v_voluntario_id
    ),
    'grupos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id,
        'nome', g.nome,
        'liderId', g.lider_id,
        'voluntarioIds', coalesce((
          select jsonb_agg(gv.voluntario_id)
          from public.grupo_voluntarios gv where gv.grupo_id = g.id
        ), '[]'::jsonb)
      ) order by g.nome)
      from public.grupos g
      where g.lider_id = v_voluntario_id
         or exists (
           select 1 from public.grupo_voluntarios gv
           where gv.grupo_id = g.id and gv.voluntario_id = v_voluntario_id
         )
    ), '[]'::jsonb),
    'voluntarios', coalesce((
      select jsonb_agg(jsonb_build_object('id', v.id, 'nome', v.nome) order by v.nome)
      from public.voluntarios v
      where exists (
        select 1
        from public.grupo_voluntarios meu
        join public.grupo_voluntarios outro on outro.grupo_id = meu.grupo_id
        where meu.voluntario_id = v_voluntario_id and outro.voluntario_id = v.id
      ) or v.id = v_voluntario_id
    ), '[]'::jsonb),
    'pessoas', coalesce((
      select jsonb_agg(distinct jsonb_build_object(
        'id', p.id, 'nome', p.nome, 'telefone', p.telefone,
        'endereco', p.endereco, 'observacoes', p.observacoes
      ))
      from public.pessoas p
      join public.visitas vi on vi.pessoa_id = p.id
      where exists (
        select 1 from public.grupo_voluntarios gv
        where gv.grupo_id = vi.grupo_id and gv.voluntario_id = v_voluntario_id
      ) or exists (
        select 1 from public.grupos g
        where g.id = vi.grupo_id and g.lider_id = v_voluntario_id
      )
    ), '[]'::jsonb),
    'visitas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', vi.id,
        'grupoId', vi.grupo_id,
        'pessoaId', vi.pessoa_id,
        'realizada', vi.realizada,
        'naoRealizada', vi.nao_realizada,
        'dataVisita', vi.data_visita,
        'observacoes', vi.observacoes,
        'pedidoOracao', vi.pedido_oracao,
        'motivoNaoRealizada', vi.motivo_nao_realizada,
        'cestaItens', coalesce((
          select jsonb_agg(jsonb_build_object(
            'alimentoId', a.id, 'nome', a.nome,
            'quantidade', vci.quantidade, 'unidade', a.unidade
          ) order by a.nome)
          from public.visita_cesta_itens vci
          join public.alimentos a on a.id = vci.alimento_id
          where vci.visita_id = vi.id
        ), '[]'::jsonb)
      ) order by vi.realizada, vi.nao_realizada, vi.created_at desc)
      from public.visitas vi
      where exists (
        select 1 from public.grupo_voluntarios gv
        where gv.grupo_id = vi.grupo_id and gv.voluntario_id = v_voluntario_id
      ) or exists (
        select 1 from public.grupos g
        where g.id = vi.grupo_id and g.lider_id = v_voluntario_id
      )
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end $$;

revoke all on function public.marcar_visita_nao_realizada(uuid, text) from public;
revoke all on function public.reabrir_visita(uuid) from public;
revoke all on function public.voluntario_marcar_visita_nao_realizada(text, uuid, text) from public;

grant execute on function public.marcar_visita_nao_realizada(uuid, text) to authenticated;
grant execute on function public.reabrir_visita(uuid) to authenticated;
grant execute on function public.voluntario_marcar_visita_nao_realizada(text, uuid, text) to anon, authenticated;

-- Se uma visita marcada como "não realizada" for concluída de fato depois, limpa a marcação
create or replace function public.finalizar_visita(
  p_visita_id uuid,
  p_data_visita date,
  p_observacoes text,
  p_pedido_oracao text
)
returns public.visitas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_visita public.visitas;
  r record;
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  select * into v_visita from public.visitas where id = p_visita_id for update;
  if not found then raise exception 'Visita não encontrada'; end if;
  if v_visita.realizada then return v_visita; end if;

  for r in
    select vci.alimento_id, vci.quantidade
    from public.visita_cesta_itens vci
    where vci.visita_id = p_visita_id
    order by vci.alimento_id
  loop
    update public.alimentos
       set quantidade = quantidade - r.quantidade
     where id = r.alimento_id and quantidade >= r.quantidade;
    if not found then raise exception 'Estoque insuficiente para concluir a visita'; end if;
  end loop;

  update public.visitas
     set realizada = true,
         nao_realizada = false,
         motivo_nao_realizada = '',
         data_visita = coalesce(p_data_visita, current_date),
         observacoes = coalesce(p_observacoes, ''),
         pedido_oracao = coalesce(p_pedido_oracao, '')
   where id = p_visita_id
   returning * into v_visita;

  insert into public.registros_visitas
    (visita_id, realizada_em, relato, pedido_oracao, registrado_por)
  values
    (p_visita_id, now(), v_visita.observacoes, v_visita.pedido_oracao, auth.uid());

  return v_visita;
end $$;

create or replace function public.voluntario_finalizar_visita(
  p_token text,
  p_visita_id uuid,
  p_data_visita date,
  p_observacoes text,
  p_pedido_oracao text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_voluntario_id uuid;
  v_grupo_id uuid;
  v_realizada boolean;
  r record;
begin
  select s.voluntario_id into v_voluntario_id
  from public.voluntario_sessoes s
  where s.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and s.expires_at > now();
  if not found then raise exception 'Sessão inválida ou expirada'; end if;

  select grupo_id, realizada into v_grupo_id, v_realizada
  from public.visitas where id = p_visita_id for update;
  if not found then raise exception 'Visita não encontrada'; end if;

  if not (
    exists (select 1 from public.grupo_voluntarios gv where gv.grupo_id = v_grupo_id and gv.voluntario_id = v_voluntario_id)
    or exists (select 1 from public.grupos g where g.id = v_grupo_id and g.lider_id = v_voluntario_id)
  ) then raise exception 'Acesso negado a esta visita'; end if;

  if not v_realizada then
    for r in
      select vci.alimento_id, vci.quantidade
      from public.visita_cesta_itens vci
      where vci.visita_id = p_visita_id
      order by vci.alimento_id
    loop
      update public.alimentos
         set quantidade = quantidade - r.quantidade
       where id = r.alimento_id and quantidade >= r.quantidade;
      if not found then raise exception 'Estoque insuficiente para concluir a visita'; end if;
    end loop;

    update public.visitas
       set realizada = true,
           nao_realizada = false,
           motivo_nao_realizada = '',
           data_visita = coalesce(p_data_visita, current_date),
           observacoes = coalesce(p_observacoes, ''),
           pedido_oracao = coalesce(p_pedido_oracao, '')
     where id = p_visita_id;

    insert into public.registros_visitas
      (visita_id, realizada_em, relato, pedido_oracao, registrado_por_voluntario)
    values
      (p_visita_id, now(), coalesce(p_observacoes, ''), coalesce(p_pedido_oracao, ''), v_voluntario_id);
  end if;

  return public.voluntario_area(p_token);
end $$;

revoke all on function public.finalizar_visita(uuid,date,text,text) from public;
revoke all on function public.voluntario_finalizar_visita(text,uuid,date,text,text) from public;
grant execute on function public.finalizar_visita(uuid,date,text,text) to authenticated;
grant execute on function public.voluntario_finalizar_visita(text,uuid,date,text,text) to anon, authenticated;