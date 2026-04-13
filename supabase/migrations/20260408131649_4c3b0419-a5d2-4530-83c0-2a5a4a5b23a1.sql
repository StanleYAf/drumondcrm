
-- Create enums for lead origin and stage
CREATE TYPE public.origem_lead AS ENUM ('Instagram', 'Facebook', 'Indicação', 'Site', 'Google', 'WhatsApp', 'Outro');
CREATE TYPE public.etapa_lead AS ENUM ('novo_lead', 'primeiro_contato', 'em_qualificacao', 'convertido', 'perdido');

-- Create leads table
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome_cliente text NOT NULL,
  empresa text,
  telefone text NOT NULL,
  email text,
  origem public.origem_lead NOT NULL DEFAULT 'Outro',
  valor_estimado numeric DEFAULT 0,
  responsavel text,
  etapa public.etapa_lead NOT NULL DEFAULT 'novo_lead',
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- RLS policies: all authenticated can read, users can CUD their own
CREATE POLICY "All authenticated can read leads" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own leads" ON public.leads FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own leads" ON public.leads FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;

-- Updated at trigger
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
