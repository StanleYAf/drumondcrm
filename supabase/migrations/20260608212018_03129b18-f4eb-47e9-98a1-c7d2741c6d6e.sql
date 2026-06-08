
DO $$ BEGIN
  CREATE TYPE public.financeiro_empresa AS ENUM ('dsh','dmedical');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.financeiro
  ADD COLUMN IF NOT EXISTS empresa public.financeiro_empresa NOT NULL DEFAULT 'dsh',
  ADD COLUMN IF NOT EXISTS custo_produtos numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custos_gerais numeric NOT NULL DEFAULT 0;

ALTER TABLE public.financeiro DROP CONSTRAINT IF EXISTS financeiro_mes_ano_key;

ALTER TABLE public.financeiro
  ADD CONSTRAINT financeiro_mes_ano_empresa_key UNIQUE (mes, ano, empresa);
