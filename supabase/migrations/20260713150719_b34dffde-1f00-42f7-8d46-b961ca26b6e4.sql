DROP POLICY IF EXISTS "Authenticated users can manage shared operational data" ON public.financeiro;

DROP POLICY IF EXISTS "Authenticated users can manage shared operational data" ON public.fornecedores;
DROP POLICY IF EXISTS "Users can update own fornecedores" ON public.fornecedores;
CREATE POLICY "Users can update own fornecedores"
ON public.fornecedores
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can manage shared operational data" ON public.contratos_clientes;
DROP POLICY IF EXISTS "Auth can select contratos_clientes" ON public.contratos_clientes;
DROP POLICY IF EXISTS "Auth can insert contratos_clientes" ON public.contratos_clientes;
DROP POLICY IF EXISTS "Auth can update contratos_clientes" ON public.contratos_clientes;
DROP POLICY IF EXISTS "Auth can delete contratos_clientes" ON public.contratos_clientes;
CREATE POLICY "Adm contratos can view contratos_clientes"
ON public.contratos_clientes
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()) OR has_cargo(auth.uid(), 'adm_contratos'));
CREATE POLICY "Adm contratos can insert contratos_clientes"
ON public.contratos_clientes
FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()) OR has_cargo(auth.uid(), 'adm_contratos'));
CREATE POLICY "Adm contratos can update contratos_clientes"
ON public.contratos_clientes
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()) OR has_cargo(auth.uid(), 'adm_contratos'))
WITH CHECK (is_admin(auth.uid()) OR has_cargo(auth.uid(), 'adm_contratos'));
CREATE POLICY "Adm contratos can delete contratos_clientes"
ON public.contratos_clientes
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()) OR has_cargo(auth.uid(), 'adm_contratos'));

DROP POLICY IF EXISTS "Authenticated users can manage shared operational data" ON public.lancamentos;
DROP POLICY IF EXISTS "Commercial roles can view lancamentos" ON public.lancamentos;
DROP POLICY IF EXISTS "Commercial launches can insert lancamentos" ON public.lancamentos;
DROP POLICY IF EXISTS "Commercial launches can update lancamentos" ON public.lancamentos;
DROP POLICY IF EXISTS "Commercial launches can delete lancamentos" ON public.lancamentos;
CREATE POLICY "Commercial roles can view lancamentos"
ON public.lancamentos
FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid())
  OR has_cargo(auth.uid(), 'dash')
  OR has_cargo(auth.uid(), 'com_dashboard')
  OR has_cargo(auth.uid(), 'com_lancamentos')
  OR has_cargo(auth.uid(), 'com_relatorios')
);
CREATE POLICY "Commercial launches can insert lancamentos"
ON public.lancamentos
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin(auth.uid())
  OR has_cargo(auth.uid(), 'dash')
  OR has_cargo(auth.uid(), 'com_lancamentos')
);
CREATE POLICY "Commercial launches can update lancamentos"
ON public.lancamentos
FOR UPDATE
TO authenticated
USING (
  is_admin(auth.uid())
  OR has_cargo(auth.uid(), 'dash')
  OR has_cargo(auth.uid(), 'com_lancamentos')
)
WITH CHECK (
  is_admin(auth.uid())
  OR has_cargo(auth.uid(), 'dash')
  OR has_cargo(auth.uid(), 'com_lancamentos')
);
CREATE POLICY "Commercial launches can delete lancamentos"
ON public.lancamentos
FOR DELETE
TO authenticated
USING (
  is_admin(auth.uid())
  OR has_cargo(auth.uid(), 'dash')
  OR has_cargo(auth.uid(), 'com_lancamentos')
);

DROP POLICY IF EXISTS "Authenticated users can manage shared operational data" ON public.leads;
DROP POLICY IF EXISTS "Commercial roles can view leads" ON public.leads;
DROP POLICY IF EXISTS "Commercial sales can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Commercial sales can update leads" ON public.leads;
DROP POLICY IF EXISTS "Commercial sales can delete leads" ON public.leads;
CREATE POLICY "Commercial roles can view leads"
ON public.leads
FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid())
  OR has_cargo(auth.uid(), 'dash')
  OR has_cargo(auth.uid(), 'com_dashboard')
  OR has_cargo(auth.uid(), 'com_vendas')
);
CREATE POLICY "Commercial sales can insert leads"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin(auth.uid())
  OR has_cargo(auth.uid(), 'dash')
  OR has_cargo(auth.uid(), 'com_vendas')
);
CREATE POLICY "Commercial sales can update leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (
  is_admin(auth.uid())
  OR has_cargo(auth.uid(), 'dash')
  OR has_cargo(auth.uid(), 'com_vendas')
)
WITH CHECK (
  is_admin(auth.uid())
  OR has_cargo(auth.uid(), 'dash')
  OR has_cargo(auth.uid(), 'com_vendas')
);
CREATE POLICY "Commercial sales can delete leads"
ON public.leads
FOR DELETE
TO authenticated
USING (
  is_admin(auth.uid())
  OR has_cargo(auth.uid(), 'dash')
  OR has_cargo(auth.uid(), 'com_vendas')
);