-- 1. Crie o usuário em Supabase Dashboard > Authentication > Users > Add user.
-- 2. Copie o UUID do usuário e substitua abaixo.
-- 3. Execute no SQL Editor usando uma conta com permissão administrativa.

insert into public.perfis (id, nome, telefone, perfil, ativo)
values (
  '4a017a5f-d677-4cee-853b-6a0e3f0232ed'::uuid,
  'Cibele Soares',
  null,
  'admin',
  true
)
on conflict (id) do update
set nome = excluded.nome,
    perfil = 'admin',
    ativo = true;
