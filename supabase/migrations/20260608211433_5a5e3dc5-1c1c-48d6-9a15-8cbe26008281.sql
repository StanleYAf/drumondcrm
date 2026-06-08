
-- Enums
DO $$ BEGIN
  CREATE TYPE public.demanda_setor AS ENUM ('engenharia','comercial','financeiro');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.demanda_status AS ENUM ('pendente','execucao','feita');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Table
CREATE TABLE public.demandas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor public.demanda_setor NOT NULL,
  titulo text NOT NULL,
  descricao text,
  status public.demanda_status NOT NULL DEFAULT 'pendente',
  responsavel_id uuid NOT NULL,
  criado_por uuid NOT NULL,
  data_entrega date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_demandas_setor ON public.demandas(setor);
CREATE INDEX idx_demandas_responsavel ON public.demandas(responsavel_id);
CREATE INDEX idx_demandas_status ON public.demandas(status);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demandas TO authenticated;
GRANT ALL ON public.demandas TO service_role;

-- Helper function: admin or display_name 'Stanley'
CREATE OR REPLACE FUNCTION public.pode_ver_todas_demandas(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id
      AND (cargo LIKE '%admin%' OR lower(display_name) = 'stanley')
  )
$$;

-- RLS
ALTER TABLE public.demandas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Demandas: leitura"
  ON public.demandas FOR SELECT
  TO authenticated
  USING (
    responsavel_id = auth.uid()
    OR criado_por = auth.uid()
    OR public.pode_ver_todas_demandas(auth.uid())
  );

CREATE POLICY "Demandas: inserir"
  ON public.demandas FOR INSERT
  TO authenticated
  WITH CHECK (
    criado_por = auth.uid()
    AND (
      responsavel_id = auth.uid()
      OR public.pode_ver_todas_demandas(auth.uid())
    )
  );

CREATE POLICY "Demandas: atualizar"
  ON public.demandas FOR UPDATE
  TO authenticated
  USING (
    responsavel_id = auth.uid()
    OR criado_por = auth.uid()
    OR public.pode_ver_todas_demandas(auth.uid())
  )
  WITH CHECK (
    responsavel_id = auth.uid()
    OR criado_por = auth.uid()
    OR public.pode_ver_todas_demandas(auth.uid())
  );

CREATE POLICY "Demandas: deletar"
  ON public.demandas FOR DELETE
  TO authenticated
  USING (
    criado_por = auth.uid()
    OR public.pode_ver_todas_demandas(auth.uid())
  );

-- updated_at trigger
CREATE TRIGGER trg_demandas_updated_at
  BEFORE UPDATE ON public.demandas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER TABLE public.demandas REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.demandas;
