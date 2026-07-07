
ALTER TABLE public.movimentacoes_estoque
  DROP COLUMN IF EXISTS forma_pagamento,
  DROP COLUMN IF EXISTS valor_total,
  DROP COLUMN IF EXISTS num_parcelas,
  DROP COLUMN IF EXISTS taxa_juros_mensal,
  DROP COLUMN IF EXISTS primeira_parcela,
  DROP COLUMN IF EXISTS parcelas;

ALTER TABLE public.movimentacoes_estoque_2
  DROP COLUMN IF EXISTS forma_pagamento,
  DROP COLUMN IF EXISTS valor_total,
  DROP COLUMN IF EXISTS num_parcelas,
  DROP COLUMN IF EXISTS taxa_juros_mensal,
  DROP COLUMN IF EXISTS primeira_parcela,
  DROP COLUMN IF EXISTS parcelas;

ALTER TABLE public.produtos_estoque
  ADD COLUMN IF NOT EXISTS forma_pagamento text,
  ADD COLUMN IF NOT EXISTS valor_total numeric,
  ADD COLUMN IF NOT EXISTS num_parcelas integer,
  ADD COLUMN IF NOT EXISTS taxa_juros_mensal numeric,
  ADD COLUMN IF NOT EXISTS primeira_parcela date,
  ADD COLUMN IF NOT EXISTS parcelas jsonb;

ALTER TABLE public.produtos_estoque_2
  ADD COLUMN IF NOT EXISTS forma_pagamento text,
  ADD COLUMN IF NOT EXISTS valor_total numeric,
  ADD COLUMN IF NOT EXISTS num_parcelas integer,
  ADD COLUMN IF NOT EXISTS taxa_juros_mensal numeric,
  ADD COLUMN IF NOT EXISTS primeira_parcela date,
  ADD COLUMN IF NOT EXISTS parcelas jsonb;
