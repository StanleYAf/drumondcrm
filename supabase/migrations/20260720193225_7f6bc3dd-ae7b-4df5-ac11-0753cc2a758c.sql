
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.send_push_async(
  _user_id uuid,
  _title text,
  _message text,
  _url text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_body jsonb;
BEGIN
  IF _user_id IS NULL THEN
    RETURN;
  END IF;
  v_body := jsonb_build_object(
    'user_id', _user_id::text,
    'title', _title,
    'message', _message
  );
  IF _url IS NOT NULL THEN
    v_body := v_body || jsonb_build_object('url', _url);
  END IF;

  PERFORM net.http_post(
    url := 'https://neiavpmruembxopzofny.supabase.co/functions/v1/send-onesignal-push',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := v_body,
    timeout_milliseconds := 5000
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'send_push_async failed: %', SQLERRM;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_demanda_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.responsavel_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message)
      VALUES (
        NEW.responsavel_id,
        'Nova demanda atribuída',
        'Você foi designado para a demanda: ' || COALESCE(NEW.titulo, 'Sem título')
      );
      PERFORM public.send_push_async(
        NEW.responsavel_id,
        'Nova demanda atribuída',
        'Você foi designado para a demanda: ' || COALESCE(NEW.titulo, 'Sem título'),
        '/demandas'
      );
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.responsavel_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message)
      VALUES (
        NEW.responsavel_id,
        'Status da demanda alterado',
        'A demanda "' || COALESCE(NEW.titulo, 'Sem título') || '" mudou para: ' || NEW.status::text
      );
      PERFORM public.send_push_async(
        NEW.responsavel_id,
        'Status da demanda alterado',
        'A demanda "' || COALESCE(NEW.titulo, 'Sem título') || '" mudou para: ' || NEW.status::text,
        '/demandas'
      );
    END IF;
    IF NEW.responsavel_id IS DISTINCT FROM OLD.responsavel_id AND NEW.responsavel_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message)
      VALUES (
        NEW.responsavel_id,
        'Demanda atribuída a você',
        'Você foi designado para a demanda: ' || COALESCE(NEW.titulo, 'Sem título')
      );
      PERFORM public.send_push_async(
        NEW.responsavel_id,
        'Demanda atribuída a você',
        'Você foi designado para a demanda: ' || COALESCE(NEW.titulo, 'Sem título'),
        '/demandas'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_demanda_change ON public.demandas;
CREATE TRIGGER trg_notify_demanda_change
AFTER INSERT OR UPDATE ON public.demandas
FOR EACH ROW EXECUTE FUNCTION public.notify_demanda_change();

CREATE OR REPLACE FUNCTION public.notify_avaliacao_critica()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin RECORD;
  v_title text;
  v_msg text;
BEGIN
  IF NEW.nota IS NULL OR NEW.nota >= 3 THEN
    RETURN NEW;
  END IF;
  v_title := 'Avaliação crítica recebida';
  v_msg := 'OS ' || COALESCE(NEW.numero_os, '?') || ' recebeu nota ' || NEW.nota
    || COALESCE(' - ' || NULLIF(NEW.comentario, ''), '');

  FOR v_admin IN
    SELECT user_id FROM public.profiles
    WHERE cargo LIKE '%admin%' AND aprovado = true
  LOOP
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (v_admin.user_id, v_title, v_msg);
    PERFORM public.send_push_async(v_admin.user_id, v_title, v_msg, '/manutencao');
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_avaliacao_critica ON public.avaliacoes_chamados;
CREATE TRIGGER trg_notify_avaliacao_critica
AFTER INSERT ON public.avaliacoes_chamados
FOR EACH ROW EXECUTE FUNCTION public.notify_avaliacao_critica();
