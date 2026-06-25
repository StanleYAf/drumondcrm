DO $$ BEGIN
  CREATE TYPE public.demanda_prioridade AS ENUM ('alta','media','normal','baixa');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.demandas
  ADD COLUMN IF NOT EXISTS prioridade public.demanda_prioridade NOT NULL DEFAULT 'normal';