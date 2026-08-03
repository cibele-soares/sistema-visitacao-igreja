# Sistema de Visitação da Igreja

Aplicação React + Vite conectada ao Supabase, com painel administrativo, solicitações públicas, área segura do voluntário, cestas com controle de estoque e execução por Docker/Nginx.

## Requisitos

### Opção recomendada: Docker

- Docker Desktop com Docker Compose.

### Sem Docker

- Node.js 22.12 ou superior.
- npm 10 ou superior.

## 1. Configurar as variáveis

Linux/macOS:

```bash
cp .env.example .env.local
```

PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Edite `.env.local`:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLICA
```

A chave `anon` aparece no navegador por definição. A segurança dos dados é garantida pelas políticas RLS da migration. Nunca use a chave `service_role` no frontend.

## 2. Atualizar o banco

Siga `supabase/SETUP.md`. Para um banco já existente, execute principalmente:

```text
supabase/migrations/20260701000000_secure_complete_schema.sql
```

Depois crie o perfil administrativo usando:

```text
supabase/create-admin.sql
```

## 3. Rodar com Docker

Na pasta do projeto:

```bash
docker compose --env-file .env.local up --build -d
```

Acesse:

```text
http://localhost:8080
```

Ver logs:

```bash
docker compose logs -f app
```

Parar:

```bash
docker compose down
```

Reconstruir depois de alterar o código ou as variáveis:

```bash
docker compose --env-file .env.local up --build -d
```

As variáveis `VITE_*` são incorporadas durante o build, por isso é necessário reconstruir o container quando elas mudarem.

## 4. Rodar sem Docker

```bash
npm ci
npm run check
npm run dev
```

Acesse `http://localhost:8080`.

Build local de produção:

```bash
npm run build
npm run preview
```

## Validações disponíveis

```bash
npm run typecheck
npm run lint
npm test
npm run check
npm run e2e
```

Para o primeiro teste E2E, instale o Chromium do Playwright:

```bash
npx playwright install chromium
npm run e2e
```

## Fluxo inicial

1. Aplique a migration do banco.
2. Crie um usuário em Supabase Authentication.
3. Cadastre esse UUID como `admin` usando `create-admin.sql`.
4. Entre por `/admin/login`.
5. Cadastre alimentos, voluntários, grupos e pessoas.
6. Gere/entregue os códigos dos voluntários.
7. Crie visitas e defina os itens das cestas.
8. Ao concluir uma visita, o estoque é baixado e o histórico é registrado.

## Segurança implementada

- Dados administrativos não são carregados em páginas públicas.
- RLS exige perfil administrativo ativo.
- Formulários públicos possuem apenas permissão de inserção.
- Voluntários usam tokens temporários de 12 horas.
- Um voluntário só consegue ler e concluir visitas de seus próprios grupos.
- Aprovações e alterações de grupo são transacionais.
- Alterações de cesta respeitam o estoque disponível.
- A imagem de produção usa Nginx e fallback para o React Router.

## Personalizar o PIX e a identidade

Antes de publicar, edite no início de `src/pages/LandingPage.tsx`:

```ts
const PIX_KEY = "sua-chave-pix";
const PIX_NAME = "NOME DO RECEBEDOR";
const PIX_CITY = "SUA CIDADE";
```

O nome e a cidade do payload PIX devem usar somente caracteres compatíveis e respeitar os limites indicados no próprio arquivo. Também substitua `public/favicon.ico`, revise o título/descrição em `index.html` e troque os textos institucionais da página inicial.

## Observação importante sobre a migration

A migration foi preparada para o esquema incluído neste projeto e para preservar os registros compatíveis. Faça backup e execute primeiro em um projeto Supabase de teste. Como o ZIP não contém acesso ao seu banco real, a aplicação da migration precisa ser validada no SQL Editor do seu projeto antes da publicação definitiva.
