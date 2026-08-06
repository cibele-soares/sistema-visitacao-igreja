-- Em vez de apagar direto a solicitação ao clicar em "Recusar", ela passa a ficar
-- marcada como "recusada" (não aparece mais em Pendentes, mas continua no banco e
-- pode ser restaurada ou apagada de vez depois, evitando perda por clique errado).
-- Execute este script no Supabase → SQL Editor (ou via supabase db push)

ALTER TABLE public.pessoas_pendentes
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente';

ALTER TABLE public.pessoas_pendentes
  ADD CONSTRAINT pessoas_pendentes_status_check CHECK (status IN ('pendente', 'recusado'));

ALTER TABLE public.voluntarios_pendentes
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente';

ALTER TABLE public.voluntarios_pendentes
  ADD CONSTRAINT voluntarios_pendentes_status_check CHECK (status IN ('pendente', 'recusado'));
