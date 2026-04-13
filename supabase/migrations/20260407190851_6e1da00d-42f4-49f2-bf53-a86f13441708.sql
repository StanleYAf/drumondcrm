
-- LANCAMENTOS: drop ALL policy, create separate SELECT + INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Users can manage own lancamentos" ON public.lancamentos;
CREATE POLICY "All authenticated can read lancamentos" ON public.lancamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own lancamentos" ON public.lancamentos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lancamentos" ON public.lancamentos FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own lancamentos" ON public.lancamentos FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- INDICADORES_SEMANAIS
DROP POLICY IF EXISTS "Users can manage own indicadores" ON public.indicadores_semanais;
CREATE POLICY "All authenticated can read indicadores" ON public.indicadores_semanais FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own indicadores" ON public.indicadores_semanais FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own indicadores" ON public.indicadores_semanais FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own indicadores" ON public.indicadores_semanais FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- POS_VENDA
DROP POLICY IF EXISTS "Users can manage own pos_venda" ON public.pos_venda;
CREATE POLICY "All authenticated can read pos_venda" ON public.pos_venda FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own pos_venda" ON public.pos_venda FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pos_venda" ON public.pos_venda FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pos_venda" ON public.pos_venda FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- NOTAS_CONTATO
DROP POLICY IF EXISTS "Users can manage own notas" ON public.notas_contato;
CREATE POLICY "All authenticated can read notas" ON public.notas_contato FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own notas" ON public.notas_contato FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notas" ON public.notas_contato FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notas" ON public.notas_contato FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- VENDEDORES
DROP POLICY IF EXISTS "Users can manage own vendedores" ON public.vendedores;
CREATE POLICY "All authenticated can read vendedores" ON public.vendedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own vendedores" ON public.vendedores FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own vendedores" ON public.vendedores FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own vendedores" ON public.vendedores FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- METAS_HISTORICAS
DROP POLICY IF EXISTS "Users can manage own metas" ON public.metas_historicas;
CREATE POLICY "All authenticated can read metas" ON public.metas_historicas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own metas" ON public.metas_historicas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own metas" ON public.metas_historicas FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own metas" ON public.metas_historicas FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- FORNECEDORES: already has separate policies, just update SELECT
DROP POLICY IF EXISTS "Users can select own fornecedores" ON public.fornecedores;
CREATE POLICY "All authenticated can read fornecedores" ON public.fornecedores FOR SELECT TO authenticated USING (true);

-- PRODUTOS_ESTOQUE
DROP POLICY IF EXISTS "Users can select own produtos_estoque" ON public.produtos_estoque;
CREATE POLICY "All authenticated can read produtos_estoque" ON public.produtos_estoque FOR SELECT TO authenticated USING (true);

-- MOVIMENTACOES_ESTOQUE
DROP POLICY IF EXISTS "Users can select own movimentacoes" ON public.movimentacoes_estoque;
CREATE POLICY "All authenticated can read movimentacoes" ON public.movimentacoes_estoque FOR SELECT TO authenticated USING (true);

-- PENDENTES_ESTOQUE
DROP POLICY IF EXISTS "Users can manage own pendentes" ON public.pendentes_estoque;
CREATE POLICY "All authenticated can read pendentes" ON public.pendentes_estoque FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own pendentes" ON public.pendentes_estoque FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pendentes" ON public.pendentes_estoque FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pendentes" ON public.pendentes_estoque FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.lancamentos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.indicadores_semanais;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_venda;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vendedores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.metas_historicas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.produtos_estoque;
ALTER PUBLICATION supabase_realtime ADD TABLE public.movimentacoes_estoque;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notas_contato;
