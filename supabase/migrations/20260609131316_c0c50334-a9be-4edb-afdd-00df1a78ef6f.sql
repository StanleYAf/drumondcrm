
-- clientes
DROP POLICY IF EXISTS "Authenticated can insert clientes" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated can update clientes" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated can delete clientes" ON public.clientes;
CREATE POLICY "Manutencao insert clientes" ON public.clientes FOR INSERT TO authenticated WITH CHECK (public.has_cargo(auth.uid(), 'manutencao'));
CREATE POLICY "Manutencao update clientes" ON public.clientes FOR UPDATE TO authenticated USING (public.has_cargo(auth.uid(), 'manutencao')) WITH CHECK (public.has_cargo(auth.uid(), 'manutencao'));
CREATE POLICY "Admin delete clientes"      ON public.clientes FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- indicadores_manutencao
DROP POLICY IF EXISTS "Authenticated can insert indicadores_manutencao" ON public.indicadores_manutencao;
DROP POLICY IF EXISTS "Authenticated can update indicadores_manutencao" ON public.indicadores_manutencao;
DROP POLICY IF EXISTS "Authenticated can delete indicadores_manutencao" ON public.indicadores_manutencao;
CREATE POLICY "Manutencao insert indicadores_manutencao" ON public.indicadores_manutencao FOR INSERT TO authenticated WITH CHECK (public.has_cargo(auth.uid(), 'manutencao'));
CREATE POLICY "Manutencao update indicadores_manutencao" ON public.indicadores_manutencao FOR UPDATE TO authenticated USING (public.has_cargo(auth.uid(), 'manutencao')) WITH CHECK (public.has_cargo(auth.uid(), 'manutencao'));
CREATE POLICY "Admin delete indicadores_manutencao"      ON public.indicadores_manutencao FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- tecnicos_manutencao
DROP POLICY IF EXISTS "Authenticated can insert tecnicos_manutencao" ON public.tecnicos_manutencao;
DROP POLICY IF EXISTS "Authenticated can update tecnicos_manutencao" ON public.tecnicos_manutencao;
DROP POLICY IF EXISTS "Authenticated can delete tecnicos_manutencao" ON public.tecnicos_manutencao;
CREATE POLICY "Manutencao insert tecnicos_manutencao" ON public.tecnicos_manutencao FOR INSERT TO authenticated WITH CHECK (public.has_cargo(auth.uid(), 'manutencao'));
CREATE POLICY "Manutencao update tecnicos_manutencao" ON public.tecnicos_manutencao FOR UPDATE TO authenticated USING (public.has_cargo(auth.uid(), 'manutencao')) WITH CHECK (public.has_cargo(auth.uid(), 'manutencao'));
CREATE POLICY "Admin delete tecnicos_manutencao"      ON public.tecnicos_manutencao FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- sync_logs
DROP POLICY IF EXISTS "Authenticated can insert sync_logs" ON public.sync_logs;
CREATE POLICY "Admin insert sync_logs" ON public.sync_logs FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
