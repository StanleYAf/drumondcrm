-- Add foto_url column to both product tables
ALTER TABLE public.produtos_estoque ADD COLUMN foto_url text;
ALTER TABLE public.produtos_estoque_2 ADD COLUMN foto_url text;

-- Create storage bucket for product photos
INSERT INTO storage.buckets (id, name, public) VALUES ('product-photos', 'product-photos', true);

-- Storage policies
CREATE POLICY "Public can view product photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-photos');

CREATE POLICY "Authenticated users can upload product photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-photos');

CREATE POLICY "Authenticated users can update product photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-photos');

CREATE POLICY "Authenticated users can delete product photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-photos');