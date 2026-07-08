ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS tem_engenharia_clinica boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tem_predial boolean NOT NULL DEFAULT true;