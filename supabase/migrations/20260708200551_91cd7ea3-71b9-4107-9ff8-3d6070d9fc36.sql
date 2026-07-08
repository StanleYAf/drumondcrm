
-- Add archive tracking to leads and pos_venda
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS etapa_changed_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS arquivado_em timestamptz;

ALTER TABLE public.pos_venda
  ADD COLUMN IF NOT EXISTS arquivado_em timestamptz;

-- Trigger: update etapa_changed_at when etapa changes
CREATE OR REPLACE FUNCTION public.leads_track_etapa_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.etapa IS DISTINCT FROM OLD.etapa THEN
    NEW.etapa_changed_at = now();
    -- Reset archive when moving out of terminal state
    IF NEW.etapa NOT IN ('perdido','convertido') THEN
      NEW.arquivado_em = NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_track_etapa ON public.leads;
CREATE TRIGGER trg_leads_track_etapa
BEFORE INSERT OR UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.leads_track_etapa_change();

-- Trigger: reset pos_venda archive when moving out of Convertido
CREATE OR REPLACE FUNCTION public.pos_venda_reset_arquivo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'Convertido' THEN
    NEW.arquivado_em = NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pos_venda_reset_arquivo ON public.pos_venda;
CREATE TRIGGER trg_pos_venda_reset_arquivo
BEFORE UPDATE ON public.pos_venda
FOR EACH ROW EXECUTE FUNCTION public.pos_venda_reset_arquivo();

-- Function: auto-archive terminal records older than 8 days
CREATE OR REPLACE FUNCTION public.auto_arquivar_leads_e_posvenda()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.leads
     SET arquivado_em = now()
   WHERE arquivado_em IS NULL
     AND etapa IN ('perdido','convertido')
     AND etapa_changed_at < now() - interval '8 days';

  UPDATE public.pos_venda
     SET arquivado_em = now()
   WHERE arquivado_em IS NULL
     AND status = 'Convertido'
     AND COALESCE(status_changed_at, updated_at) < now() - interval '8 days';
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_arquivar_leads_e_posvenda() TO authenticated;
