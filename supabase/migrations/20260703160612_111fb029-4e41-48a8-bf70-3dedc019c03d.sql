DROP POLICY IF EXISTS "Owner or admin can update pos_venda" ON public.pos_venda;
CREATE POLICY "Authenticated can update pos_venda"
ON public.pos_venda FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Owner or admin can update notas_contato" ON public.notas_contato;
CREATE POLICY "Authenticated can update notas_contato"
ON public.notas_contato FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);