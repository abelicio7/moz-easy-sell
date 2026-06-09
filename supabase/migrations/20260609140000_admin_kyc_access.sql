-- Ensure the KYC bucket exists, in case previous migrations failed
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc_documents', 'kyc_documents', false) ON CONFLICT (id) DO NOTHING;

-- Admins can view any KYC document. We join with profiles where role = 'admin'
CREATE POLICY "Admins can view any kyc doc" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'kyc_documents' AND 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
