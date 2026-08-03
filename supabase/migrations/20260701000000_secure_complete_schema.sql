-- Correção estrutural e de segurança do Sistema de Visitação
-- Esta migration foi feita para ser aplicada DEPOIS das migrations antigas.

create extension if not exists pgcrypto with schema extensions;

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabelas ausentes
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.pessoas_pendentes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null default '',
  endereco text not null,
  observacoes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.voluntarios_pendentes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null default '',
  disponibilidade text not null default '',
  created_at timestamptz not null default now()
);

alter table public.pessoas_pendentes enable row level security;
alter table public.voluntarios_pendentes enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- Datas: converte TEXT para DATE sem perder registros antigos válidos
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'alimentos'
      and column_name = 'data_entrada' and data_type = 'text'
  ) then
    alter table public.alimentos add column if not exists data_entrada_nova date;
    update public.alimentos
       set data_entrada_nova = case
         when data_entrada ~ '^\d{4}-\d{2}-\d{2}$' then data_entrada::date
         when data_entrada ~ '^\d{2}/\d{2}/\d{4}$' then to_date(data_entrada, 'DD/MM/YYYY')
         else created_at::date
       end;
    alter table public.alimentos drop column data_entrada;
    alter table public.alimentos rename column data_entrada_nova to data_entrada;
  end if;
end $$;

alter table public.alimentos alter column data_entrada set default current_date;
update public.alimentos set data_entrada = created_at::date where data_entrada is null;
alter table public.alimentos alter column data_entrada set not null;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'visitas'
      and column_name = 'data_visita' and data_type = 'text'
  ) then
    alter table public.visitas add column if not exists data_visita_nova date;
    update public.visitas
       set data_visita_nova = case
         when data_visita ~ '^\d{4}-\d{2}-\d{2}$' then data_visita::date
         when data_visita ~ '^\d{2}/\d{2}/\d{4}$' then to_date(data_visita, 'DD/MM/YYYY')
         else null
       end;
    alter table public.visitas drop column data_visita;
    alter table public.visitas rename column data_visita_nova to data_visita;
  end if;
end $$;

alter table public.visitas alter column data_visita drop not null;
alter table public.visitas alter column data_visita drop default;
alter table public.visitas add column if not exists pedido_oracao text not null default '';

-- ─────────────────────────────────────────────────────────────────────────────
-- Itens de cesta normalizados (usa IDs e quantidade, não nomes soltos)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.visita_cesta_itens (
  visita_id uuid not null references public.visitas(id) on delete cascade,
  alimento_id uuid not null references public.alimentos(id) on delete restrict,
  quantidade integer not null default 1 check (quantidade > 0),
  created_at timestamptz not null default now(),
  primary key (visita_id, alimento_id)
);
alter table public.visita_cesta_itens enable row level security;

-- Migra os nomes antigos para referências por ID quando houver correspondência.
insert into public.visita_cesta_itens (visita_id, alimento_id, quantidade)
select distinct vi.id, a.id, 1
from public.visitas vi
cross join lateral unnest(coalesce(vi.cesta_itens, '{}'::text[])) item(nome)
join public.alimentos a on lower(trim(a.nome)) = lower(trim(item.nome))
on conflict (visita_id, alimento_id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- Histórico e sessões de voluntários
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.registros_visitas
  add column if not exists pedido_oracao text,
  add column if not exists registrado_por_voluntario uuid references public.voluntarios(id) on delete set null;

create table if not exists public.voluntario_sessoes (
  id uuid primary key default gen_random_uuid(),
  voluntario_id uuid not null references public.voluntarios(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);
create index if not exists voluntario_sessoes_expires_idx on public.voluntario_sessoes(expires_at);
alter table public.voluntario_sessoes enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- Helpers de autorização
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.perfis p
    where p.id = (select auth.uid())
      and p.perfil = 'admin'
      and p.ativo = true
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Remove TODAS as políticas antigas das tabelas administradas.
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'pessoas','voluntarios','alimentos','grupos','grupo_voluntarios','visitas',
        'visita_cesta_itens','perfis','registros_visitas','pessoas_pendentes',
        'voluntarios_pendentes','voluntario_sessoes'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- Tabelas privadas: somente administradores autenticados.
create policy admin_pessoas on public.pessoas for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy admin_voluntarios on public.voluntarios for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy admin_alimentos on public.alimentos for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy admin_grupos on public.grupos for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy admin_grupo_voluntarios on public.grupo_voluntarios for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy admin_visitas on public.visitas for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy admin_visita_cesta_itens on public.visita_cesta_itens for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy admin_registros on public.registros_visitas for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Perfil: cada usuário lê/edita apenas o próprio perfil; admin também pode ler.
create policy perfil_select_self on public.perfis for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy perfil_update_self on public.perfis for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Formulários públicos: anônimo só pode INSERIR. Administrador gerencia tudo.
create policy pessoa_pendente_public_insert on public.pessoas_pendentes for insert to anon, authenticated
  with check (
    length(trim(nome)) between 2 and 150
    and length(trim(endereco)) between 3 and 500
    and length(telefone) <= 30
    and length(observacoes) <= 3000
  );
create policy pessoa_pendente_admin on public.pessoas_pendentes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy voluntario_pendente_public_insert on public.voluntarios_pendentes for insert to anon, authenticated
  with check (
    length(trim(nome)) between 2 and 150
    and length(telefone) <= 30
    and length(disponibilidade) <= 1000
  );
create policy voluntario_pendente_admin on public.voluntarios_pendentes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Ninguém acessa sessões diretamente pela API.
-- O acesso acontece apenas pelas RPCs SECURITY DEFINER abaixo.

-- Privilégios explícitos: a anon key não lê tabelas privadas.
revoke all on table public.pessoas, public.voluntarios, public.alimentos, public.grupos,
  public.grupo_voluntarios, public.visitas, public.visita_cesta_itens, public.perfis,
  public.registros_visitas, public.voluntario_sessoes from anon;

grant select, insert, update, delete on table public.pessoas, public.voluntarios,
  public.alimentos, public.grupos, public.grupo_voluntarios, public.visitas,
  public.visita_cesta_itens, public.registros_visitas to authenticated;

grant select on table public.perfis to authenticated;
revoke update on table public.perfis from authenticated;
grant update (nome, telefone) on table public.perfis to authenticated;

grant insert on table public.pessoas_pendentes, public.voluntarios_pendentes to anon, authenticated;
grant select, insert, update, delete on table public.pessoas_pendentes, public.voluntarios_pendentes to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Operações administrativas transacionais
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.salvar_grupo(
  p_id uuid,
  p_nome text,
  p_lider_id uuid,
  p_voluntario_ids uuid[]
)
returns public.grupos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grupo public.grupos;
  v_ids uuid[] := coalesce(p_voluntario_ids, '{}'::uuid[]);
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  if length(trim(p_nome)) < 2 then raise exception 'Nome do grupo inválido'; end if;
  if p_lider_id is not null and not (p_lider_id = any(v_ids)) then
    v_ids := array_append(v_ids, p_lider_id);
  end if;

  insert into public.grupos (id, nome, lider_id)
  values (p_id, trim(p_nome), p_lider_id)
  on conflict (id) do update set nome = excluded.nome, lider_id = excluded.lider_id
  returning * into v_grupo;

  delete from public.grupo_voluntarios where grupo_id = p_id;
  insert into public.grupo_voluntarios (grupo_id, voluntario_id)
  select p_id, x from unnest(v_ids) x
  on conflict (grupo_id, voluntario_id) do nothing;

  return v_grupo;
end $$;

create or replace function public.aprovar_pessoa_pendente(p_id uuid)
returns public.pessoas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pendente public.pessoas_pendentes;
  v_pessoa public.pessoas;
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  select * into v_pendente from public.pessoas_pendentes where id = p_id for update;
  if not found then raise exception 'Solicitação não encontrada'; end if;

  insert into public.pessoas (nome, telefone, endereco, observacoes)
  values (v_pendente.nome, v_pendente.telefone, v_pendente.endereco, v_pendente.observacoes)
  returning * into v_pessoa;
  delete from public.pessoas_pendentes where id = p_id;
  return v_pessoa;
end $$;

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

  insert into public.voluntarios (nome, telefone, disponibilidade, eh_lider, codigo)
  values (v_pendente.nome, v_pendente.telefone, v_pendente.disponibilidade, false, upper(trim(p_codigo)))
  returning * into v_voluntario;
  delete from public.voluntarios_pendentes where id = p_id;
  return v_voluntario;
end $$;

create or replace function public.definir_item_cesta(
  p_visita_id uuid,
  p_alimento_id uuid,
  p_quantidade integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estoque integer;
  v_reservado integer;
  v_realizada boolean;
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  select realizada into v_realizada from public.visitas where id = p_visita_id for update;
  if not found then raise exception 'Visita não encontrada'; end if;
  if v_realizada then raise exception 'Não é possível alterar a cesta de uma visita realizada'; end if;

  if p_quantidade <= 0 then
    delete from public.visita_cesta_itens
    where visita_id = p_visita_id and alimento_id = p_alimento_id;
    return;
  end if;

  select quantidade into v_estoque from public.alimentos where id = p_alimento_id for update;
  if not found then raise exception 'Alimento não encontrado'; end if;

  select coalesce(sum(vci.quantidade), 0)::integer into v_reservado
  from public.visita_cesta_itens vci
  join public.visitas vi on vi.id = vci.visita_id
  where vci.alimento_id = p_alimento_id
    and vi.realizada = false
    and vci.visita_id <> p_visita_id;

  if v_reservado + p_quantidade > v_estoque then
    raise exception 'Estoque insuficiente. Disponível para reserva: %', greatest(v_estoque - v_reservado, 0);
  end if;

  insert into public.visita_cesta_itens (visita_id, alimento_id, quantidade)
  values (p_visita_id, p_alimento_id, p_quantidade)
  on conflict (visita_id, alimento_id) do update set quantidade = excluded.quantidade;
end $$;

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

-- Mantém eh_lider sincronizado com grupos.lider_id.
create or replace function public.sincronizar_lideres()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.voluntarios v
     set eh_lider = exists (select 1 from public.grupos g where g.lider_id = v.id);
  return null;
end $$;

drop trigger if exists sincronizar_lideres_trigger on public.grupos;
create trigger sincronizar_lideres_trigger
after insert or update of lider_id or delete on public.grupos
for each statement execute function public.sincronizar_lideres();

-- ─────────────────────────────────────────────────────────────────────────────
-- Acesso seguro do voluntário por token temporário
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.voluntario_login(p_codigo text)
returns table(token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_voluntario_id uuid;
  v_token text;
  v_expires timestamptz := now() + interval '12 hours';
begin
  delete from public.voluntario_sessoes as sessao where sessao.expires_at <= now();

  select id into v_voluntario_id
  from public.voluntarios
  where codigo = upper(trim(p_codigo))
  limit 1;

  if not found then raise exception 'Código inválido'; end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.voluntario_sessoes (voluntario_id, token_hash, expires_at)
  values (v_voluntario_id, encode(extensions.digest(v_token, 'sha256'), 'hex'), v_expires);

  return query select v_token, v_expires;
end $$;

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
        'dataVisita', vi.data_visita,
        'observacoes', vi.observacoes,
        'pedidoOracao', vi.pedido_oracao,
        'cestaItens', coalesce((
          select jsonb_agg(jsonb_build_object(
            'alimentoId', a.id, 'nome', a.nome,
            'quantidade', vci.quantidade, 'unidade', a.unidade
          ) order by a.nome)
          from public.visita_cesta_itens vci
          join public.alimentos a on a.id = vci.alimento_id
          where vci.visita_id = vi.id
        ), '[]'::jsonb)
      ) order by vi.realizada, vi.created_at desc)
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

create or replace function public.voluntario_logout(p_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.voluntario_sessoes
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;

-- Execução das RPCs.
revoke all on function public.salvar_grupo(uuid,text,uuid,uuid[]) from public;
revoke all on function public.aprovar_pessoa_pendente(uuid) from public;
revoke all on function public.aprovar_voluntario_pendente(uuid,text) from public;
revoke all on function public.definir_item_cesta(uuid,uuid,integer) from public;
revoke all on function public.finalizar_visita(uuid,date,text,text) from public;
revoke all on function public.voluntario_login(text) from public;
revoke all on function public.voluntario_area(text) from public;
revoke all on function public.voluntario_finalizar_visita(text,uuid,date,text,text) from public;
revoke all on function public.voluntario_logout(text) from public;

grant execute on function public.salvar_grupo(uuid,text,uuid,uuid[]) to authenticated;
grant execute on function public.aprovar_pessoa_pendente(uuid) to authenticated;
grant execute on function public.aprovar_voluntario_pendente(uuid,text) to authenticated;
grant execute on function public.definir_item_cesta(uuid,uuid,integer) to authenticated;
grant execute on function public.finalizar_visita(uuid,date,text,text) to authenticated;
grant execute on function public.voluntario_login(text) to anon, authenticated;
grant execute on function public.voluntario_area(text) to anon, authenticated;
grant execute on function public.voluntario_finalizar_visita(text,uuid,date,text,text) to anon, authenticated;
grant execute on function public.voluntario_logout(text) to anon, authenticated;

-- Realtime para sincronizar painéis administrativos entre dispositivos.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.pessoas; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.voluntarios; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.alimentos; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.grupos; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.grupo_voluntarios; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.visitas; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.visita_cesta_itens; exception when duplicate_object then null; end;
  end if;
end $$;
