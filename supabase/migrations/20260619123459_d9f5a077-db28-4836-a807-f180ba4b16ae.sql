CREATE TABLE public.contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_contrato text NOT NULL UNIQUE,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  tipo text NOT NULL CHECK (tipo IN ('preventivo', 'corretivo', 'full-risk', 'locacao')),
  equipamentos_cobertos text,
  vigencia_inicio date NOT NULL,
  vigencia_fim date NOT NULL,
  valor_mensal numeric(12,2),
  valor_anual numeric(12,2),
  responsavel_comercial text,
  drive_url text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratos TO authenticated;
GRANT ALL ON public.contratos TO service_role;

ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view contratos"
  ON public.contratos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert contratos"
  ON public.contratos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update contratos"
  ON public.contratos FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete contratos"
  ON public.contratos FOR DELETE
  TO authenticated
  USING (true);

CREATE TRIGGER update_contratos_updated_at
  BEFORE UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_contratos_cliente_id ON public.contratos(cliente_id);
CREATE INDEX idx_contratos_vigencia_fim ON public.contratos(vigencia_fim);