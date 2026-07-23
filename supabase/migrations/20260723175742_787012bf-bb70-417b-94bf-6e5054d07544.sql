CREATE TABLE public.rotina_tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendedor text NOT NULL,
  data date NOT NULL,
  tipo text NOT NULL,
  descricao text NOT NULL,
  concluida boolean NOT NULL DEFAULT false,
  concluida_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rotina_tarefas TO authenticated;
GRANT ALL ON public.rotina_tarefas TO service_role;

ALTER TABLE public.rotina_tarefas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view rotina_tarefas"
  ON public.rotina_tarefas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owner can manage own rotina_tarefas"
  ON public.rotina_tarefas FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_rotina_tarefas_user_data ON public.rotina_tarefas(user_id, data);
CREATE INDEX idx_rotina_tarefas_vendedor_data ON public.rotina_tarefas(vendedor, data);