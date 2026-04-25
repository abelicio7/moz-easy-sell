-- Create storage bucket for quiz images (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('quiz-images', 'quiz-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read
CREATE POLICY "Public can view quiz images"
ON storage.objects FOR SELECT
USING (bucket_id = 'quiz-images');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload quiz images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'quiz-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to update their own images
CREATE POLICY "Authenticated users can update quiz images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'quiz-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete their own images
CREATE POLICY "Authenticated users can delete quiz images"
ON storage.objects FOR DELETE
USING (bucket_id = 'quiz-images' AND auth.role() = 'authenticated');
