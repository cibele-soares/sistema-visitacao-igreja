-- Adiciona campo de pedido de oração / observação espiritual na tabela visitas
-- Execute este script no Supabase → SQL Editor

ALTER TABLE public.visitas
  ADD COLUMN IF NOT EXISTS pedido_oracao TEXT NOT NULL DEFAULT '';
