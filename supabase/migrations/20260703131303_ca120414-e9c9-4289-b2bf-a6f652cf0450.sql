
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS logo_url text;

ALTER TABLE public.indicadores_manutencao
  ADD COLUMN IF NOT EXISTS eng_total_equipamentos integer,
  ADD COLUMN IF NOT EXISTS eng_equipamentos_ativos integer,
  ADD COLUMN IF NOT EXISTS pred_total_equipamentos integer,
  ADD COLUMN IF NOT EXISTS pred_equipamentos_ativos integer;

DROP POLICY IF EXISTS "Public can view client logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload client logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update client logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete client logos" ON storage.objects;

CREATE POLICY "Public can view client logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'client-logos');

CREATE POLICY "Authenticated can upload client logos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-logos');

CREATE POLICY "Authenticated can update client logos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'client-logos');

CREATE POLICY "Authenticated can delete client logos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'client-logos');
