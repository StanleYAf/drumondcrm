
-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Authenticated insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Trigger function for demandas
CREATE OR REPLACE FUNCTION public.notify_demanda_change()
RETURNS TRIGGER
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
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.responsavel_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message)
      VALUES (
        NEW.responsavel_id,
        'Status da demanda alterado',
        'A demanda "' || COALESCE(NEW.titulo, 'Sem título') || '" mudou para: ' || NEW.status::text
      );
    END IF;
    -- If responsavel changed to a new person, notify them
    IF NEW.responsavel_id IS DISTINCT FROM OLD.responsavel_id AND NEW.responsavel_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message)
      VALUES (
        NEW.responsavel_id,
        'Demanda atribuída a você',
        'Você foi designado para a demanda: ' || COALESCE(NEW.titulo, 'Sem título')
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_demanda_insert
  AFTER INSERT ON public.demandas
  FOR EACH ROW EXECUTE FUNCTION public.notify_demanda_change();

CREATE TRIGGER trg_notify_demanda_update
  AFTER UPDATE ON public.demandas
  FOR EACH ROW EXECUTE FUNCTION public.notify_demanda_change();
