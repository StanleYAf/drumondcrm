
-- 1) New independent clients table for Contratos
CREATE TABLE IF NOT EXISTS public.contratos_clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cnpj text,
  categoria text,
  responsavel_financeiro text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratos_clientes TO authenticated;
GRANT ALL ON public.contratos_clientes TO service_role;

ALTER TABLE public.contratos_clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth can select contratos_clientes" ON public.contratos_clientes;
DROP POLICY IF EXISTS "Auth can insert contratos_clientes" ON public.contratos_clientes;
DROP POLICY IF EXISTS "Auth can update contratos_clientes" ON public.contratos_clientes;
DROP POLICY IF EXISTS "Auth can delete contratos_clientes" ON public.contratos_clientes;

CREATE POLICY "Auth can select contratos_clientes" ON public.contratos_clientes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth can insert contratos_clientes" ON public.contratos_clientes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth can update contratos_clientes" ON public.contratos_clientes
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth can delete contratos_clientes" ON public.contratos_clientes
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

DROP TRIGGER IF EXISTS trg_contratos_clientes_updated ON public.contratos_clientes;
CREATE TRIGGER trg_contratos_clientes_updated
  BEFORE UPDATE ON public.contratos_clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Extend contratos with new fields aligned with spreadsheet
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS contratos_cliente_id uuid REFERENCES public.contratos_clientes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS data_faturamento date,
  ADD COLUMN IF NOT EXISTS data_vencimento date,
  ADD COLUMN IF NOT EXISTS valor_contrato numeric,
  ADD COLUMN IF NOT EXISTS parcelas integer,
  ADD COLUMN IF NOT EXISTS retem_iss boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS servico_contratado text,
  ADD COLUMN IF NOT EXISTS status_manual text,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS created_by_name text;
