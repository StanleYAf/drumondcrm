
-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  cargo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Vendedores table
CREATE TABLE public.vendedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.vendedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own vendedores" ON public.vendedores FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Lancamentos table
CREATE TYPE public.categoria_lancamento AS ENUM ('produto', 'servico', 'contrato', 'acessorio');

CREATE TABLE public.lancamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  categoria categoria_lancamento NOT NULL,
  cliente TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  data DATE NOT NULL,
  produto TEXT,
  servico TEXT,
  item TEXT,
  vendedor TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own lancamentos" ON public.lancamentos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_lancamentos_user_data ON public.lancamentos(user_id, data);
CREATE INDEX idx_lancamentos_categoria ON public.lancamentos(categoria);

CREATE TRIGGER update_lancamentos_updated_at BEFORE UPDATE ON public.lancamentos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indicadores semanais
CREATE TABLE public.indicadores_semanais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  semana INTEGER NOT NULL,
  mes TEXT NOT NULL,
  ano INTEGER NOT NULL,
  vendedor TEXT NOT NULL,
  captacoes INTEGER NOT NULL DEFAULT 0,
  orcamentos INTEGER NOT NULL DEFAULT 0,
  visitas INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.indicadores_semanais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own indicadores" ON public.indicadores_semanais FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_indicadores_user_periodo ON public.indicadores_semanais(user_id, ano, mes);

CREATE TRIGGER update_indicadores_updated_at BEFORE UPDATE ON public.indicadores_semanais
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Pós-venda
CREATE TYPE public.status_pos_venda AS ENUM ('Aguardando retorno', 'Contatado', 'Convertido');

CREATE TABLE public.pos_venda (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  cliente TEXT NOT NULL,
  vendedor TEXT NOT NULL,
  status status_pos_venda NOT NULL DEFAULT 'Aguardando retorno',
  status_changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.pos_venda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own pos_venda" ON public.pos_venda FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_pos_venda_updated_at BEFORE UPDATE ON public.pos_venda
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notas de contato (pós-venda)
CREATE TABLE public.notas_contato (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pos_venda_id UUID NOT NULL REFERENCES public.pos_venda(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.notas_contato ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notas" ON public.notas_contato FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Metas históricas
CREATE TABLE public.metas_historicas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INTEGER NOT NULL,
  meta_produto NUMERIC NOT NULL DEFAULT 0,
  meta_servico NUMERIC NOT NULL DEFAULT 0,
  meta_contrato NUMERIC NOT NULL DEFAULT 0,
  meta_acessorio NUMERIC NOT NULL DEFAULT 0,
  meta_captacoes INTEGER NOT NULL DEFAULT 0,
  meta_orcamentos INTEGER NOT NULL DEFAULT 0,
  meta_visitas INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, mes, ano)
);
ALTER TABLE public.metas_historicas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own metas" ON public.metas_historicas FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_metas_updated_at BEFORE UPDATE ON public.metas_historicas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
