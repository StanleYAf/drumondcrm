
ALTER TABLE public.movimentacoes_estoque
  ADD COLUMN IF NOT EXISTS forma_pagamento text,
  ADD COLUMN IF NOT EXISTS valor_total numeric,
  ADD COLUMN IF NOT EXISTS num_parcelas integer,
  ADD COLUMN IF NOT EXISTS taxa_juros_mensal numeric,
  ADD COLUMN IF NOT EXISTS primeira_parcela date,
  ADD COLUMN IF NOT EXISTS parcelas jsonb;

ALTER TABLE public.movimentacoes_estoque_2
  ADD COLUMN IF NOT EXISTS forma_pagamento text,
  ADD COLUMN IF NOT EXISTS valor_total numeric,
  ADD COLUMN IF NOT EXISTS num_parcelas integer,
  ADD COLUMN IF NOT EXISTS taxa_juros_mensal numeric,
  ADD COLUMN IF NOT EXISTS primeira_parcela date,
  ADD COLUMN IF NOT EXISTS parcelas jsonb;
