# Correções realizadas

## Segurança

- Dados administrativos só são carregados após confirmação de perfil `admin` ativo.
- Políticas RLS públicas foram removidas das tabelas privadas.
- O público pode apenas enviar solicitações pendentes.
- Alteração de função administrativa foi bloqueada por privilégios de coluna.
- A área do voluntário usa RPCs `SECURITY DEFINER`, token temporário e validação de vínculo com o grupo.
- O token do voluntário é armazenado no banco apenas como hash SHA-256.
- Chaves reais do Supabase não são incluídas no ZIP.

## Consistência dos dados

- Operações de gravação aguardam resposta do banco antes de exibir sucesso.
- Aprovações, grupos, cestas e conclusão de visitas usam funções transacionais.
- Itens de cesta usam IDs e quantidades, com reserva e baixa de estoque.
- Datas foram convertidas para `DATE`.
- Histórico é criado na conclusão da visita.
- Exclusões e atualizações locais foram sincronizadas.
- Requisições antigas não podem repopular dados privados após logout.

## Qualidade e execução

- TypeScript estrito habilitado.
- Tipos do Supabase atualizados para as tabelas e RPCs usadas.
- ESLint sem erros.
- Testes unitários para código de acesso e payload PIX.
- Rotas carregadas sob demanda.
- Docker multi-stage com Nginx e fallback do React Router.
- Metadados e idioma do HTML corrigidos.
- Dependências atualizadas e auditoria sem vulnerabilidades conhecidas no momento da geração.

## Validações executadas

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm audit --audit-level=moderate`
- servidor Vite de produção acessado por HTTP local

## Validações que dependem do seu ambiente

- Executar a migration no seu projeto Supabase e conferir os dados reais.
- Construir a imagem Docker no seu computador/servidor.
- Executar o Playwright após `npx playwright install chromium`.
