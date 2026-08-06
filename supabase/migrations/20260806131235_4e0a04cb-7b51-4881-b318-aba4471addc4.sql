CREATE TABLE public.arkmeds_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base text NOT NULL,
  tipo_documento text NOT NULL,
  numero_documento text NOT NULL,
  equipamento_nome text,
  numero_serie text,
  cliente_solicitante text,
  status text NOT NULL DEFAULT 'ok',
  motivo_problema text,
  data_validade date,
  url_pdf text NOT NULL,
  conteudo_texto text,
  conteudo_tabelas jsonb,
  data_extracao timestamptz NOT NULL DEFAULT now(),
  UNIQUE (base, tipo_documento, equipamento_nome, numero_serie)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.arkmeds_documentos TO authenticated;
GRANT ALL ON public.arkmeds_documentos TO service_role;

ALTER TABLE public.arkmeds_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view arkmeds_documentos"
  ON public.arkmeds_documentos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can manage arkmeds_documentos"
  ON public.arkmeds_documentos FOR ALL TO authenticated USING (true) WITH CHECK (true);