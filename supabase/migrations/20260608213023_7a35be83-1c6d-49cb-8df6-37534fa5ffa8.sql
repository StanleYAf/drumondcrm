
CREATE OR REPLACE FUNCTION public.pode_gerenciar_usuarios(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id
      AND (
        cargo LIKE '%admin%'
        OR lower(display_name) = 'stanley'
        OR lower(display_name) IN ('andré souza', 'andre souza')
      )
  )
$$;

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Managers can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.pode_gerenciar_usuarios(auth.uid()))
WITH CHECK (public.pode_gerenciar_usuarios(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Managers can delete profiles"
ON public.profiles
FOR DELETE
USING (public.pode_gerenciar_usuarios(auth.uid()));
