-- Create gig-assets storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gig-assets',
  'gig-assets',
  true, -- Public read access
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for gig-assets

-- Allow authenticated users to upload
CREATE POLICY "Users can upload gig assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'gig-assets');

-- Allow authenticated users to update their own assets (path convention: userId/...)
CREATE POLICY "Users can update own gig assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'gig-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own assets
CREATE POLICY "Users can delete own gig assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'gig-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access
CREATE POLICY "Anyone can view gig assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'gig-assets');

