
-- ============================================================
-- 1. Helper: has_cargo (SECURITY DEFINER, RLS-safe)
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_cargo(_user_id uuid, _cargo text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id
      AND aprovado = true
      AND (cargo LIKE '%' || _cargo || '%' OR cargo LIKE '%admin%')
  )
$$;

-- ============================================================
-- 2. Privilege escalation fix: drop display_name backdoor
-- ============================================================
CREATE OR REPLACE FUNCTION public.pode_gerenciar_usuarios(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND cargo LIKE '%admin%'
  )
$$;

CREATE OR REPLACE FUNCTION public.pode_ver_todas_demandas(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND cargo LIKE '%admin%'
  )
$$;

-- ============================================================
-- 3. Trigger: prevent self role/name/approval escalation
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() = OLD.user_id AND NOT public.is_admin(auth.uid()) THEN
    IF NEW.cargo IS DISTINCT FROM OLD.cargo THEN
      RAISE EXCEPTION 'Não autorizado a alterar o próprio cargo';
    END IF;
    IF NEW.display_name IS DISTINCT FROM OLD.display_name THEN
      RAISE EXCEPTION 'Não autorizado a alterar o próprio nome de exibição';
    END IF;
    IF NEW.aprovado IS DISTINCT FROM OLD.aprovado THEN
      RAISE EXCEPTION 'Não autorizado a alterar o próprio status de aprovação';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_self_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_role_escalation();

-- ============================================================
-- 4. financeiro: admin-only
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can read financeiro"   ON public.financeiro;
DROP POLICY IF EXISTS "Authenticated can insert financeiro" ON public.financeiro;
DROP POLICY IF EXISTS "Authenticated can update financeiro" ON public.financeiro;
DROP POLICY IF EXISTS "Authenticated can delete financeiro" ON public.financeiro;

CREATE POLICY "Admins read financeiro"   ON public.financeiro FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins insert financeiro" ON public.financeiro FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins update financeiro" ON public.financeiro FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins delete financeiro" ON public.financeiro FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- ============================================================
-- 5. fornecedores: own + admin
-- ============================================================
DROP POLICY IF EXISTS "All authenticated can read fornecedores" ON public.fornecedores;
CREATE POLICY "Users read own fornecedores" ON public.fornecedores
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- ============================================================
-- 6. lancamentos: scope read to dash/admin
-- ============================================================
DROP POLICY IF EXISTS "All authenticated can read lancamentos" ON public.lancamentos;
CREATE POLICY "Dash and admin read lancamentos" ON public.lancamentos
  FOR SELECT TO authenticated
  USING (public.has_cargo(auth.uid(), 'dash'));

-- ============================================================
-- 7. leads: scope read to dash/admin
-- ============================================================
DROP POLICY IF EXISTS "All authenticated can read leads" ON public.leads;
CREATE POLICY "Dash and admin read leads" ON public.leads
  FOR SELECT TO authenticated
  USING (public.has_cargo(auth.uid(), 'dash'));

-- ============================================================
-- 8. ordens_servico: manutencao/admin
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can read ordens_servico"   ON public.ordens_servico;
DROP POLICY IF EXISTS "Authenticated can insert ordens_servico" ON public.ordens_servico;
DROP POLICY IF EXISTS "Authenticated can update ordens_servico" ON public.ordens_servico;
DROP POLICY IF EXISTS "Authenticated can delete ordens_servico" ON public.ordens_servico;

CREATE POLICY "Manutencao read ordens_servico"   ON public.ordens_servico FOR SELECT TO authenticated USING (public.has_cargo(auth.uid(), 'manutencao'));
CREATE POLICY "Manutencao insert ordens_servico" ON public.ordens_servico FOR INSERT TO authenticated WITH CHECK (public.has_cargo(auth.uid(), 'manutencao'));
CREATE POLICY "Manutencao update ordens_servico" ON public.ordens_servico FOR UPDATE TO authenticated USING (public.has_cargo(auth.uid(), 'manutencao')) WITH CHECK (public.has_cargo(auth.uid(), 'manutencao'));
CREATE POLICY "Admin delete ordens_servico"      ON public.ordens_servico FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- ============================================================
-- 9. produtos_estoque + produtos_estoque_2: owner/controlador
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can update produtos_estoque" ON public.produtos_estoque;
DROP POLICY IF EXISTS "Authenticated can delete produtos_estoque" ON public.produtos_estoque;

CREATE POLICY "Owner or estoque update produtos_estoque" ON public.produtos_estoque
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_controlador(auth.uid()) OR public.has_cargo(auth.uid(), 'estoque'))
  WITH CHECK (auth.uid() = user_id OR public.is_controlador(auth.uid()) OR public.has_cargo(auth.uid(), 'estoque'));

CREATE POLICY "Owner or controlador delete produtos_estoque" ON public.produtos_estoque
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_controlador(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can update produtos_estoque_2" ON public.produtos_estoque_2;
DROP POLICY IF EXISTS "Authenticated can delete produtos_estoque_2" ON public.produtos_estoque_2;

CREATE POLICY "Owner or estoque update produtos_estoque_2" ON public.produtos_estoque_2
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_controlador(auth.uid()) OR public.has_cargo(auth.uid(), 'estoque'))
  WITH CHECK (auth.uid() = user_id OR public.is_controlador(auth.uid()) OR public.has_cargo(auth.uid(), 'estoque'));

CREATE POLICY "Owner or controlador delete produtos_estoque_2" ON public.produtos_estoque_2
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_controlador(auth.uid()));

-- ============================================================
-- 10. Storage: add missing UPDATE on lancamento-anexos
-- ============================================================
DROP POLICY IF EXISTS "Users update own lancamento anexos" ON storage.objects;
CREATE POLICY "Users update own lancamento anexos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'lancamento-anexos' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'lancamento-anexos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- 11. Storage: restrict product-photos listing to authenticated
--     (public URLs to individual files keep working)
-- ============================================================
DROP POLICY IF EXISTS "Public can view product photos" ON storage.objects;
CREATE POLICY "Auth can list product photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'product-photos');
