CREATE TABLE public.avaliacoes_chamados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_os text NOT NULL,
  base text NOT NULL,
  nota integer NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario text,
  responsavel_tecnico text,
  arquivado_em timestamptz,
  arquivado_por text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (numero_os, base)
);

GRANT SELECT ON public.avaliacoes_chamados TO authenticated;
GRANT ALL ON public.avaliacoes_chamados TO service_role;

ALTER TABLE public.avaliacoes_chamados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read avaliacoes"
  ON public.avaliacoes_chamados FOR SELECT TO authenticated USING (true);