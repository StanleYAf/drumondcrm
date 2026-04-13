-- Drop old restrictive UPDATE/DELETE policies for produtos_estoque
DROP POLICY IF EXISTS "Users can update own produtos_estoque" ON public.produtos_estoque;
DROP POLICY IF EXISTS "Users can delete own produtos_estoque" ON public.produtos_estoque;

-- Create new permissive policies for produtos_estoque
CREATE POLICY "Authenticated can update produtos_estoque"
ON public.produtos_estoque FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Authenticated can delete produtos_estoque"
ON public.produtos_estoque FOR DELETE TO authenticated
USING (true);

-- Drop old restrictive UPDATE/DELETE policies for produtos_estoque_2
DROP POLICY IF EXISTS "Users can update own produtos_estoque_2" ON public.produtos_estoque_2;
DROP POLICY IF EXISTS "Users can delete own produtos_estoque_2" ON public.produtos_estoque_2;

-- Create new permissive policies for produtos_estoque_2
CREATE POLICY "Authenticated can update produtos_estoque_2"
ON public.produtos_estoque_2 FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Authenticated can delete produtos_estoque_2"
ON public.produtos_estoque_2 FOR DELETE TO authenticated
USING (true);