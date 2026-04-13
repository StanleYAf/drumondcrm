
-- 1. Fornecedores
CREATE TABLE public.fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  cnpj TEXT,
  contato TEXT,
  email TEXT,
  telefone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own fornecedores" ON public.fornecedores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own fornecedores" ON public.fornecedores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own fornecedores" ON public.fornecedores FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own fornecedores" ON public.fornecedores FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_fornecedores_updated_at BEFORE UPDATE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Produtos Estoque
CREATE TABLE public.produtos_estoque (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  codigo_barras TEXT,
  categoria TEXT,
  unidade TEXT NOT NULL DEFAULT 'un',
  estoque_atual NUMERIC NOT NULL DEFAULT 0,
  estoque_minimo NUMERIC NOT NULL DEFAULT 1,
  preco_custo NUMERIC,
  preco_venda NUMERIC,
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  numero_serie TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, codigo_barras)
);

ALTER TABLE public.produtos_estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own produtos_estoque" ON public.produtos_estoque FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own produtos_estoque" ON public.produtos_estoque FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own produtos_estoque" ON public.produtos_estoque FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own produtos_estoque" ON public.produtos_estoque FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_produtos_estoque_updated_at BEFORE UPDATE ON public.produtos_estoque FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_produtos_estoque_codigo_barras ON public.produtos_estoque(codigo_barras);

-- 3. Movimentações Estoque
CREATE TABLE public.movimentacoes_estoque (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  produto_id UUID NOT NULL REFERENCES public.produtos_estoque(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste', 'devolucao')),
  quantidade NUMERIC NOT NULL,
  motivo TEXT,
  documento_ref TEXT,
  vendedor_id UUID REFERENCES public.vendedores(id) ON DELETE SET NULL,
  cliente TEXT,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own movimentacoes" ON public.movimentacoes_estoque FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own movimentacoes" ON public.movimentacoes_estoque FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own movimentacoes" ON public.movimentacoes_estoque FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own movimentacoes" ON public.movimentacoes_estoque FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_movimentacoes_produto_created ON public.movimentacoes_estoque(produto_id, created_at);
