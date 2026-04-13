
-- Table: produtos_estoque_2
CREATE TABLE public.produtos_estoque_2 (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  nome text NOT NULL,
  categoria text,
  codigo_barras text,
  numero_serie text,
  unidade text NOT NULL DEFAULT 'un',
  estoque_atual numeric NOT NULL DEFAULT 0,
  estoque_minimo numeric NOT NULL DEFAULT 1,
  preco_custo numeric,
  preco_venda numeric,
  fornecedor_id uuid,
  ativo boolean NOT NULL DEFAULT true,
  registro_anvisa text,
  fabricante text,
  validade date,
  local_estoque text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.produtos_estoque_2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can read produtos_estoque_2" ON public.produtos_estoque_2 FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own produtos_estoque_2" ON public.produtos_estoque_2 FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own produtos_estoque_2" ON public.produtos_estoque_2 FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own produtos_estoque_2" ON public.produtos_estoque_2 FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_produtos_estoque_2_updated_at BEFORE UPDATE ON public.produtos_estoque_2 FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: movimentacoes_estoque_2
CREATE TABLE public.movimentacoes_estoque_2 (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  produto_id uuid NOT NULL REFERENCES public.produtos_estoque_2(id),
  tipo text NOT NULL,
  quantidade numeric NOT NULL,
  motivo text,
  documento_ref text,
  vendedor_id uuid REFERENCES public.vendedores(id),
  cliente text,
  observacao text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.movimentacoes_estoque_2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can read movimentacoes_2" ON public.movimentacoes_estoque_2 FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own movimentacoes_2" ON public.movimentacoes_estoque_2 FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own movimentacoes_2" ON public.movimentacoes_estoque_2 FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own movimentacoes_2" ON public.movimentacoes_estoque_2 FOR DELETE USING (auth.uid() = user_id);

-- Table: pendentes_estoque_2
CREATE TABLE public.pendentes_estoque_2 (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  produto_id uuid NOT NULL REFERENCES public.produtos_estoque_2(id),
  quantidade numeric NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pendentes_estoque_2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can read pendentes_2" ON public.pendentes_estoque_2 FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own pendentes_2" ON public.pendentes_estoque_2 FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pendentes_2" ON public.pendentes_estoque_2 FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pendentes_2" ON public.pendentes_estoque_2 FOR DELETE USING (auth.uid() = user_id);
