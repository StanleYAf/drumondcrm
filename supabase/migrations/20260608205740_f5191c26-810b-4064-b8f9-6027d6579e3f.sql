
CREATE TABLE public.lancamento_anexos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lancamento_id UUID NOT NULL REFERENCES public.lancamentos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  path TEXT NOT NULL,
  tipo TEXT,
  tamanho BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lancamento_anexos_lancamento ON public.lancamento_anexos(lancamento_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lancamento_anexos TO authenticated;
GRANT ALL ON public.lancamento_anexos TO service_role;

ALTER TABLE public.lancamento_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can read anexos"
  ON public.lancamento_anexos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users insert own anexos"
  ON public.lancamento_anexos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own anexos"
  ON public.lancamento_anexos FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users update own anexos"
  ON public.lancamento_anexos FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Storage policies for bucket lancamento-anexos (files stored under {user_id}/...)
CREATE POLICY "Auth can read lancamento anexos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'lancamento-anexos');

CREATE POLICY "Users upload own lancamento anexos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lancamento-anexos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own lancamento anexos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'lancamento-anexos' AND auth.uid()::text = (storage.foldername(name))[1]);
