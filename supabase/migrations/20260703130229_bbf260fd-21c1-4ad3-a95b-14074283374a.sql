DROP POLICY IF EXISTS "Authenticated can update pos_venda" ON public.pos_venda;
DROP POLICY IF EXISTS "Authenticated can delete pos_venda" ON public.pos_venda;

CREATE POLICY "Owner or admin can update pos_venda"
  ON public.pos_venda FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Owner or admin can delete pos_venda"
  ON public.pos_venda FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can update notas" ON public.notas_contato;
DROP POLICY IF EXISTS "Authenticated can delete notas" ON public.notas_contato;

CREATE POLICY "Owner or admin can update notas"
  ON public.notas_contato FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Owner or admin can delete notas"
  ON public.notas_contato FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));