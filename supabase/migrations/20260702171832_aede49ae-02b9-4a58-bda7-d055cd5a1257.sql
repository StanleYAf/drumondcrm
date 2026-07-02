-- pos_venda: permitir UPDATE/DELETE para qualquer autenticado (SELECT já é compartilhado)
DROP POLICY IF EXISTS "Users can update own pos_venda" ON public.pos_venda;
DROP POLICY IF EXISTS "Users can delete own pos_venda" ON public.pos_venda;

CREATE POLICY "Authenticated can update pos_venda"
  ON public.pos_venda
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete pos_venda"
  ON public.pos_venda
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- notas_contato: mesmo padrão (dependente do pos_venda compartilhado)
DROP POLICY IF EXISTS "Users can update own notas" ON public.notas_contato;
DROP POLICY IF EXISTS "Users can delete own notas" ON public.notas_contato;

CREATE POLICY "Authenticated can update notas"
  ON public.notas_contato
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete notas"
  ON public.notas_contato
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);