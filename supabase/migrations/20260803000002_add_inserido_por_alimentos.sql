-- Registra qual admin logado cadastrou cada item de alimento
-- O valor é preenchido automaticamente pelo banco (auth.uid()), o app nunca precisa enviá-lo
-- Execute este script no Supabase → SQL Editor (ou via supabase db push)

ALTER TABLE public.alimentos
  ADD COLUMN IF NOT EXISTS inserido_por uuid REFERENCES public.perfis(id) DEFAULT auth.uid();
