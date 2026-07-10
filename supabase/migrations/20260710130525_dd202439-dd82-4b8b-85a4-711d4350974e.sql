
CREATE TYPE public.tipo_servico_cronograma AS ENUM ('P', 'C', 'T', 'Q', 'AA', 'V');
CREATE TYPE public.status_cronograma AS ENUM ('planejado', 'adiada', 'executado', 'desativado', 'instalado');

CREATE TABLE public.cronograma_equipamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  equipamento text NOT NULL,
  modelo text,
  marca text,
  localizacao text,
  identificacao text,
  registro_anvisa text,
  numero_serie text,
  patrimonio text,
  tem_contrato_terceiro boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'Ativo',
  fornecedor text,
  descontinuidade boolean NOT NULL DEFAULT false,
  periodicidade text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cronograma_equipamentos TO authenticated;
GRANT ALL ON public.cronograma_equipamentos TO service_role;

ALTER TABLE public.cronograma_equipamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view cronograma_equipamentos"
  ON public.cronograma_equipamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage cronograma_equipamentos"
  ON public.cronograma_equipamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.cronograma_planejamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id uuid NOT NULL REFERENCES public.cronograma_equipamentos(id) ON DELETE CASCADE,
  ano integer NOT NULL,
  mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  tipo_servico public.tipo_servico_cronograma NOT NULL,
  status public.status_cronograma NOT NULL DEFAULT 'planejado',
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (equipamento_id, ano, mes, tipo_servico)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cronograma_planejamento TO authenticated;
GRANT ALL ON public.cronograma_planejamento TO service_role;

ALTER TABLE public.cronograma_planejamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view cronograma_planejamento"
  ON public.cronograma_planejamento FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage cronograma_planejamento"
  ON public.cronograma_planejamento FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_cronograma_planejamento_updated_at
  BEFORE UPDATE ON public.cronograma_planejamento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
