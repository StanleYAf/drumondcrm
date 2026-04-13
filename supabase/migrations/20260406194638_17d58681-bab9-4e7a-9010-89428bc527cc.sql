
-- Add aprovado column, default false for new users
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS aprovado boolean NOT NULL DEFAULT false;

-- Mark all existing users as approved
UPDATE public.profiles SET aprovado = true;

-- Update the handle_new_user function to set aprovado = false
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, aprovado)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), false);
  RETURN NEW;
END;
$function$;
