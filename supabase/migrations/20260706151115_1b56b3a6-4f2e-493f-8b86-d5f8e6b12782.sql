-- Garantir persistência em dados operacionais compartilhados para usuários autenticados.
-- A navegação/visibilidade continua controlada no app; estas regras evitam bloqueios de salvamento no banco.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratos TO authenticated;
GRANT ALL ON public.contratos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratos_clientes TO authenticated;
GRANT ALL ON public.contratos_clientes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.controle_art TO authenticated;
GRANT ALL ON public.controle_art TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demandas TO authenticated;
GRANT ALL ON public.demandas TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financeiro TO authenticated;
GRANT ALL ON public.financeiro TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedores TO authenticated;
GRANT ALL ON public.fornecedores TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.indicadores_manutencao TO authenticated;
GRANT ALL ON public.indicadores_manutencao TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.indicadores_semanais TO authenticated;
GRANT ALL ON public.indicadores_semanais TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lancamento_anexos TO authenticated;
GRANT ALL ON public.lancamento_anexos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lancamento_itens TO authenticated;
GRANT ALL ON public.lancamento_itens TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lancamentos TO authenticated;
GRANT ALL ON public.lancamentos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.metas_historicas TO authenticated;
GRANT ALL ON public.metas_historicas TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacoes_estoque TO authenticated;
GRANT ALL ON public.movimentacoes_estoque TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacoes_estoque_2 TO authenticated;
GRANT ALL ON public.movimentacoes_estoque_2 TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notas_contato TO authenticated;
GRANT ALL ON public.notas_contato TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ordens_servico TO authenticated;
GRANT ALL ON public.ordens_servico TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pendentes_estoque TO authenticated;
GRANT ALL ON public.pendentes_estoque TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pendentes_estoque_2 TO authenticated;
GRANT ALL ON public.pendentes_estoque_2 TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_venda TO authenticated;
GRANT ALL ON public.pos_venda TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos_estoque TO authenticated;
GRANT ALL ON public.produtos_estoque TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos_estoque_2 TO authenticated;
GRANT ALL ON public.produtos_estoque_2 TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tecnicos_manutencao TO authenticated;
GRANT ALL ON public.tecnicos_manutencao TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendedores TO authenticated;
GRANT ALL ON public.vendedores TO service_role;

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'clientes',
    'contratos',
    'contratos_clientes',
    'controle_art',
    'demandas',
    'financeiro',
    'fornecedores',
    'indicadores_manutencao',
    'indicadores_semanais',
    'lancamento_anexos',
    'lancamento_itens',
    'lancamentos',
    'leads',
    'metas_historicas',
    'movimentacoes_estoque',
    'movimentacoes_estoque_2',
    'notas_contato',
    'ordens_servico',
    'pendentes_estoque',
    'pendentes_estoque_2',
    'pos_venda',
    'produtos_estoque',
    'produtos_estoque_2',
    'tecnicos_manutencao',
    'vendedores'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = tbl
        AND policyname = 'Authenticated users can manage shared operational data'
    ) THEN
      EXECUTE format('DROP POLICY %I ON public.%I', 'Authenticated users can manage shared operational data', tbl);
    END IF;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      'Authenticated users can manage shared operational data',
      tbl
    );
  END LOOP;
END $$;