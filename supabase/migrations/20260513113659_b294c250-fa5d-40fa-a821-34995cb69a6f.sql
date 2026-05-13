-- 1. Nova tabela clientes
CREATE TABLE IF NOT EXISTS public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  responsavel text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read clientes"
  ON public.clientes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert clientes"
  ON public.clientes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update clientes"
  ON public.clientes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete clientes"
  ON public.clientes FOR DELETE TO authenticated USING (true);

-- 2. Coluna cliente_id
ALTER TABLE public.indicadores_manutencao
  ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES public.clientes(id) ON DELETE CASCADE;

ALTER TABLE public.tecnicos_manutencao
  ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES public.clientes(id) ON DELETE CASCADE;

-- 3. Constraint unique
ALTER TABLE public.indicadores_manutencao
  DROP CONSTRAINT IF EXISTS indicadores_manutencao_mes_ano_key;

ALTER TABLE public.indicadores_manutencao
  ADD CONSTRAINT indicadores_manutencao_cliente_mes_ano_key
  UNIQUE (cliente_id, mes, ano);