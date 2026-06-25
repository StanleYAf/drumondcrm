DROP POLICY IF EXISTS "Admins insert financeiro" ON public.financeiro;
DROP POLICY IF EXISTS "Admins update financeiro" ON public.financeiro;
DROP POLICY IF EXISTS "Admins delete financeiro" ON public.financeiro;

CREATE POLICY "Fin insert financeiro" ON public.financeiro
  FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()) OR has_cargo(auth.uid(), 'fin_dashboard'));

CREATE POLICY "Fin update financeiro" ON public.financeiro
  FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()) OR has_cargo(auth.uid(), 'fin_dashboard'))
  WITH CHECK (is_admin(auth.uid()) OR has_cargo(auth.uid(), 'fin_dashboard'));

CREATE POLICY "Fin delete financeiro" ON public.financeiro
  FOR DELETE TO authenticated
  USING (is_admin(auth.uid()) OR has_cargo(auth.uid(), 'fin_dashboard'));