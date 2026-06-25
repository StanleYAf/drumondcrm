CREATE TABLE IF NOT EXISTS public.controle_art (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_art          text NOT NULL,
  responsavel_tecnico text NOT NULL,
  crea_cau            text,
  cliente             text,
  descricao_servico   text,
  data_emissao        date NOT NULL,
  data_vencimento     date NOT NULL,
  valor               numeric(12,2),
  drive_url           text,
  observacoes         text,
  created_at          timestamptz DEFAULT now(),
  created_by          uuid REFERENCES auth.users(id),
  created_by_name     text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.controle_art TO authenticated;
GRANT ALL ON public.controle_art TO service_role;
ALTER TABLE public.controle_art ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_users_all" ON public.controle_art FOR ALL TO authenticated USING (true) WITH CHECK (true);