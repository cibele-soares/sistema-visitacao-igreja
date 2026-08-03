-- Execute após a migration. As consultas são apenas de leitura.

-- 1) Confira as políticas. Não deve existir política irrestrita nas tabelas privadas.
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 2) Confira privilégios concedidos a anon e authenticated.
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

-- 3) Confira as funções expostas.
select routine_name, security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'is_admin', 'salvar_grupo', 'aprovar_pessoa_pendente',
    'aprovar_voluntario_pendente', 'definir_item_cesta', 'finalizar_visita',
    'voluntario_login', 'voluntario_area', 'voluntario_finalizar_visita',
    'voluntario_logout'
  )
order by routine_name;

-- 4) Confira os tipos das datas.
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and (table_name, column_name) in (('alimentos','data_entrada'), ('visitas','data_visita'));
