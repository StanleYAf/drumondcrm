CREATE TABLE public.sync_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  cliente_id uuid NULL,
  mes text NULL,
  ano integer NULL,
  total_os integer NOT NULL DEFAULT 0,
  total_indicadores integer NOT NULL DEFAULT 0,
  total_tecnicos integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'sucesso',
  mensagem text NULL
);

GRANT SELECT, INSERT ON public.sync_logs TO authenticated;
GRANT ALL ON public.sync_logs TO service_role;

ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read sync_logs"
  ON public.sync_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert sync_logs"
  ON public.sync_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_sync_logs_created_at ON public.sync_logs (created_at DESC);
CREATE INDEX idx_sync_logs_cliente ON public.sync_logs (cliente_id);
CREATE INDEX idx_sync_logs_mes_ano ON public.sync_logs (ano, mes);