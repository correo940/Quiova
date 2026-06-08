-- Add photo_url column to shopping_items
ALTER TABLE public.shopping_items
ADD COLUMN IF NOT EXISTS photo_url text;

-- Create shopping-photos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shopping-photos',
  'shopping-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view shopping photos (public bucket)
CREATE POLICY "Shopping photos are public"
ON storage.objects FOR SELECT
USING ( bucket_id = 'shopping-photos' );

-- Users can upload their own shopping photos
CREATE POLICY "Users can upload shopping photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'shopping-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own shopping photos
CREATE POLICY "Users can update shopping photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'shopping-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own shopping photos
CREATE POLICY "Users can delete shopping photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'shopping-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
