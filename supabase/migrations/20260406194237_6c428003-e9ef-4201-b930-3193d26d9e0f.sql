
-- Attach the trigger to create profiles for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create profiles for existing users that don't have one
INSERT INTO public.profiles (user_id, display_name, cargo)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', email), 'admin'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.profiles);
