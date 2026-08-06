-- Permite que voluntários autorizados (marcados pelo admin) cadastrem alimentos
-- pela área do voluntário. O nome de quem cadastrou aparece normalmente na
-- lista de "Controle de Alimentos" do admin.
-- Execute este script no Supabase → SQL Editor (ou via supabase db push)

-- 1) Flag por voluntário, controlada pelo admin em "Voluntários"
ALTER TABLE public.voluntarios
  ADD COLUMN IF NOT EXISTS pode_controlar_alimentos boolean NOT NULL DEFAULT false;

-- 2) Referência opcional de qual voluntário inseriu o alimento
--    (o campo "inserido_por" existente continua sendo usado para admins)
ALTER TABLE public.alimentos
  ADD COLUMN IF NOT EXISTS inserido_por_voluntario uuid REFERENCES public.voluntarios(id);

-- 3) RPC: retorna se o voluntário pode controlar alimentos + os alimentos que ele já cadastrou
create or replace function public.voluntario_alimentos_info(p_token text)
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

  select jsonb_build_object(
    'podeControlarAlimentos', coalesce(v.pode_controlar_alimentos, false),
    'meusAlimentos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'nome', a.nome,
        'quantidade', a.quantidade,
        'unidade', a.unidade,
        'casaOracao', a.casa_oracao,
        'dataEntrada', a.data_entrada
      ) order by a.created_at desc)
      from public.alimentos a
      where a.inserido_por_voluntario = v_voluntario_id
    ), '[]'::jsonb)
  ) into v_result
  from public.voluntarios v
  where v.id = v_voluntario_id;

  return v_result;
end $$;

-- 4) RPC: cria o alimento em nome do voluntário logado (exige a permissão acima)
create or replace function public.voluntario_criar_alimento(
  p_token text,
  p_nome text,
  p_quantidade numeric,
  p_unidade text,
  p_casa_oracao text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_voluntario_id uuid;
  v_pode_controlar boolean;
begin
  select s.voluntario_id into v_voluntario_id
  from public.voluntario_sessoes s
  where s.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and s.expires_at > now();
  if not found then raise exception 'Sessão inválida ou expirada'; end if;

  select pode_controlar_alimentos into v_pode_controlar
  from public.voluntarios where id = v_voluntario_id;

  if not coalesce(v_pode_controlar, false) then
    raise exception 'Você não tem permissão para cadastrar alimentos';
  end if;

  if coalesce(trim(p_nome), '') = ''
     or p_quantidade is null or p_quantidade < 0
     or coalesce(trim(p_unidade), '') = ''
     or coalesce(trim(p_casa_oracao), '') = '' then
    raise exception 'Informe nome, quantidade válida, unidade e casa de oração';
  end if;

  insert into public.alimentos (nome, quantidade, unidade, data_entrada, casa_oracao, inserido_por_voluntario)
  values (trim(p_nome), p_quantidade, trim(p_unidade), current_date, trim(p_casa_oracao), v_voluntario_id);

  return public.voluntario_alimentos_info(p_token);
end $$;

revoke all on function public.voluntario_alimentos_info(text) from public;
revoke all on function public.voluntario_criar_alimento(text,text,numeric,text,text) from public;

grant execute on function public.voluntario_alimentos_info(text) to anon, authenticated;
grant execute on function public.voluntario_criar_alimento(text,text,numeric,text,text) to anon, authenticated;