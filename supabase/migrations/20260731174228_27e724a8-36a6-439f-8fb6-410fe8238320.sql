ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS etapa_changed_at timestamptz DEFAULT now();

CREATE OR REPLACE FUNCTION public.registrar_primeiro_atendimento()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.etapa = 'novo_lead' AND NEW.etapa <> 'novo_lead' THEN
    NEW.etapa_changed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_registrar_primeiro_atendimento ON public.leads;
CREATE TRIGGER trg_registrar_primeiro_atendimento
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.registrar_primeiro_atendimento();