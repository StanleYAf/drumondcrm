
CREATE TABLE public.lancamento_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lancamento_id UUID NOT NULL REFERENCES public.lancamentos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  identificacao TEXT,
  marca TEXT,
  modelo TEXT,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lancamento_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can read lancamento_itens"
ON public.lancamento_itens FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can insert own lancamento_itens"
ON public.lancamento_itens FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lancamento_itens"
ON public.lancamento_itens FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lancamento_itens"
ON public.lancamento_itens FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_lancamento_itens_lancamento_id ON public.lancamento_itens(lancamento_id);
