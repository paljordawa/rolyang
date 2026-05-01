-- Run this in Supabase Dashboard → SQL Editor
-- Allows logged-in users to upload to the audio and thumbnails storage buckets

-- Audio bucket: authenticated users can upload
CREATE POLICY "Authenticated users can upload audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'audio');

-- Thumbnails bucket: authenticated users can upload
CREATE POLICY "Authenticated users can upload thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'thumbnails');

-- Allow authenticated users to update/replace existing files (upsert)
CREATE POLICY "Authenticated users can update audio"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'audio');

CREATE POLICY "Authenticated users can update thumbnails"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'thumbnails');
