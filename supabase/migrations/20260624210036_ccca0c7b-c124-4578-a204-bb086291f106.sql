-- Permitir leitura do módulo Financeiro a usuários com permissão fin_dashboard
DROP POLICY IF EXISTS "Admins read financeiro" ON public.financeiro;

CREATE POLICY "Fin dashboard read financeiro"
  ON public.financeiro
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.has_cargo(auth.uid(), 'fin_dashboard')
  );