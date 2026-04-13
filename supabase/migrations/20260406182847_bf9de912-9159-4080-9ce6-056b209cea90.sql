
CREATE TABLE public.pendentes_estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  produto_id uuid NOT NULL REFERENCES public.produtos_estoque(id) ON DELETE CASCADE,
  quantidade numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pendente'
);

ALTER TABLE public.pendentes_estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own pendentes"
  ON public.pendentes_estoque
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
