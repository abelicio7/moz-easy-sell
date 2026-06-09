-- Make the bucket public so users can download files without OTP-to-Role trickery
UPDATE storage.buckets SET public = true WHERE id = 'product_files';

-- Ensure everyone can view product files (since the url is effectively unguessable)
CREATE POLICY "Public access to product files" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'product_files');
