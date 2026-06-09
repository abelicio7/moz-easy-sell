-- Create product_files storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product_files', 'product_files', false) 
ON CONFLICT (id) DO NOTHING;

-- Allows authenticated users to upload their own product files
CREATE POLICY "Users can upload their own product files" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'product_files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Sellers can view their own product files
CREATE POLICY "Sellers can view their own product files" 
ON storage.objects FOR SELECT TO authenticated 
USING (bucket_id = 'product_files');

-- Sellers can delete their own product files
CREATE POLICY "Sellers can delete their own product files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product_files' AND auth.uid()::text = (storage.foldername(name))[1]);
