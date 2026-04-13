ALTER TABLE public.produtos_estoque
  ADD COLUMN registro_anvisa text,
  ADD COLUMN fabricante text,
  ADD COLUMN validade date,
  ADD COLUMN local_estoque text;