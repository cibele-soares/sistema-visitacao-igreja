# Configuração do Supabase

## Antes de começar

Faça um backup do banco em **Project Settings > Database > Backups** ou exporte os dados importantes. A migration converte datas antigas de texto para `DATE`, substitui as políticas RLS públicas e cria as funções usadas pela nova versão.

## Banco já existente

1. Abra **Supabase > SQL Editor**.
2. Abra o arquivo `migrations/20260701000000_secure_complete_schema.sql`.
3. Copie todo o conteúdo, cole no SQL Editor e execute.
4. Confirme que a execução terminou sem erro.
5. Em **Authentication > Users**, crie o usuário responsável caso ainda não exista.
6. Copie o UUID do usuário.
7. Edite e execute `create-admin.sql` com esse UUID.
8. Entre no sistema e, em **Voluntários**, troque códigos antigos curtos por códigos novos de 10 caracteres.

## Banco novo

Execute os arquivos de `migrations/` em ordem crescente de nome. A última migration remove as políticas públicas criadas pela primeira e aplica a segurança correta.

## O que a migration altera

- Cria `pessoas_pendentes` e `voluntarios_pendentes`.
- Restringe tabelas privadas a perfis administrativos ativos.
- Permite ao público apenas inserir solicitações pendentes.
- Impede alteração do campo `perfil` pelo próprio usuário.
- Converte datas para o tipo `DATE`.
- Normaliza os itens das cestas em `visita_cesta_itens`.
- Controla reserva e baixa de estoque.
- Cria aprovações transacionais.
- Cria sessões temporárias para voluntários.
- Registra histórico ao concluir visitas.
- Ativa sincronização Realtime das tabelas administrativas.

## Não faça

- Não coloque uma chave `service_role` em arquivos `VITE_*`.
- Não recrie políticas com `USING (true)` nas tabelas privadas.
- Não publique `.env.local` no GitHub.
