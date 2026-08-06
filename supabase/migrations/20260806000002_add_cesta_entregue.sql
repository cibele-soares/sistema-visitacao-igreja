-- Adiciona o campo "cesta entregue?" (sim/não) ao concluir uma visita.
-- Obrigatório tanto no registro do admin quanto na área do voluntário.
-- Execute este script no Supabase → SQL Editor (ou via supabase db push)

alter table public.visitas
  add column if not exists cesta_entregue boolean not null default false;

alter table public.registros_visitas
  add column if not exists cesta_entregue boolean not null default false;

-- Admin: finalizar_visita passa a receber p_cesta_entregue
drop function if exists public.finalizar_visita(uuid, date, text, text);

create or replace function public.finalizar_visita(
  p_visita_id uuid,
  p_data_visita date,
  p_observacoes text,
  p_pedido_oracao text,
  p_cesta_entregue boolean
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
         pedido_oracao = coalesce(p_pedido_oracao, ''),
         cesta_entregue = coalesce(p_cesta_entregue, false)
   where id = p_visita_id
   returning * into v_visita;

  insert into public.registros_visitas
    (visita_id, realizada_em, relato, pedido_oracao, cesta_entregue, registrado_por)
  values
    (p_visita_id, now(), v_visita.observacoes, v_visita.pedido_oracao, v_visita.cesta_entregue, auth.uid());

  return v_visita;
end $$;

-- Voluntário: voluntario_finalizar_visita passa a receber p_cesta_entregue
drop function if exists public.voluntario_finalizar_visita(text, uuid, date, text, text);

create or replace function public.voluntario_finalizar_visita(
  p_token text,
  p_visita_id uuid,
  p_data_visita date,
  p_observacoes text,
  p_pedido_oracao text,
  p_cesta_entregue boolean
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
           pedido_oracao = coalesce(p_pedido_oracao, ''),
           cesta_entregue = coalesce(p_cesta_entregue, false)
     where id = p_visita_id;

    insert into public.registros_visitas
      (visita_id, realizada_em, relato, pedido_oracao, cesta_entregue, registrado_por_voluntario)
    values
      (p_visita_id, now(), coalesce(p_observacoes, ''), coalesce(p_pedido_oracao, ''), coalesce(p_cesta_entregue, false), v_voluntario_id);
  end if;

  return public.voluntario_area(p_token);
end $$;

revoke all on function public.finalizar_visita(uuid,date,text,text,boolean) from public;
revoke all on function public.voluntario_finalizar_visita(text,uuid,date,text,text,boolean) from public;
grant execute on function public.finalizar_visita(uuid,date,text,text,boolean) to authenticated;
grant execute on function public.voluntario_finalizar_visita(text,uuid,date,text,text,boolean) to anon, authenticated;

-- Atualiza voluntario_area para expor cestaEntregue nas visitas
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
        'cestaEntregue', vi.cesta_entregue,
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