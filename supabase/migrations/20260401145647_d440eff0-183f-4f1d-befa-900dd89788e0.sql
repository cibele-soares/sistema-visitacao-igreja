
-- Pessoas (quem vai receber visita)
CREATE TABLE public.pessoas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  endereco TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.pessoas ENABLE ROW LEVEL SECURITY;
-- Política criada somente na migration 20260701000000_secure_complete_schema.sql

-- Voluntários
CREATE TABLE public.voluntarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL DEFAULT '',
  disponibilidade TEXT NOT NULL DEFAULT '',
  eh_lider BOOLEAN NOT NULL DEFAULT false,
  codigo TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT voluntarios_codigo_unique UNIQUE (codigo)
);
ALTER TABLE public.voluntarios ENABLE ROW LEVEL SECURITY;
-- Política criada somente na migration 20260701000000_secure_complete_schema.sql

-- Alimentos
CREATE TABLE public.alimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 0,
  unidade TEXT NOT NULL DEFAULT '',
  data_entrada TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.alimentos ENABLE ROW LEVEL SECURITY;
-- Política criada somente na migration 20260701000000_secure_complete_schema.sql

-- Grupos
CREATE TABLE public.grupos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  lider_id UUID REFERENCES public.voluntarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;
-- Política criada somente na migration 20260701000000_secure_complete_schema.sql

-- Associação grupo <-> voluntários
CREATE TABLE public.grupo_voluntarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  voluntario_id UUID NOT NULL REFERENCES public.voluntarios(id) ON DELETE CASCADE,
  CONSTRAINT grupo_voluntarios_unique UNIQUE (grupo_id, voluntario_id)
);
ALTER TABLE public.grupo_voluntarios ENABLE ROW LEVEL SECURITY;
-- Política criada somente na migration 20260701000000_secure_complete_schema.sql

-- Visitas
CREATE TABLE public.visitas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  pessoa_id UUID NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  cesta_itens TEXT[] NOT NULL DEFAULT '{}',
  realizada BOOLEAN NOT NULL DEFAULT false,
  data_visita TEXT NOT NULL DEFAULT '',
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.visitas ENABLE ROW LEVEL SECURITY;
-- Política criada somente na migration 20260701000000_secure_complete_schema.sql

-- ────────────────────────────────────────────────────────────────────────────
-- TABELA: perfis (adicionada para autenticação de admins via Supabase Auth)
-- Execute esta parte depois de criar as tabelas acima
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.perfis (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome       TEXT NOT NULL,
  telefone   TEXT,
  perfil     TEXT NOT NULL DEFAULT 'admin' CHECK (perfil IN ('admin','voluntario_responsavel')),
  ativo      BOOLEAN NOT NULL DEFAULT true,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
-- Política criada somente na migration 20260701000000_secure_complete_schema.sql
-- Política criada somente na migration 20260701000000_secure_complete_schema.sql
-- Política criada somente na migration 20260701000000_secure_complete_schema.sql

-- TABELA: registros_visitas (histórico das visitas realizadas)
CREATE TABLE IF NOT EXISTS public.registros_visitas (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visita_id      UUID NOT NULL REFERENCES public.visitas(id) ON DELETE CASCADE,
  realizada_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  relato         TEXT,
  registrado_por UUID REFERENCES public.perfis(id)
);
ALTER TABLE public.registros_visitas ENABLE ROW LEVEL SECURITY;
-- Política criada somente na migration 20260701000000_secure_complete_schema.sql
