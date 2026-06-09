-- 1. Create storage bucket for KYC documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc_documents', 'kyc_documents', false) ON CONFLICT DO NOTHING;

-- Define RLS policies for the bucket (only user can upload their own, only admins can view all)
CREATE POLICY "Users can upload their own kyc docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'kyc_documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view their own kyc docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'kyc_documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add KYC fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS identity_status TEXT DEFAULT 'unverified';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS identity_document_url TEXT;

-- 2. Update default profile status to 'approved' so users can sell right away
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
BEGIN
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name', 
    NEW.raw_user_meta_data->>'full_name', 
    NEW.raw_user_meta_data->>'display_name',
    ''
  );

  INSERT INTO public.profiles (id, full_name, email, status, role, identity_status)
  VALUES (
    NEW.id,
    user_name,
    NEW.email,
    'approved', -- Automatically approved to sell
    'seller',
    'unverified'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = CASE WHEN public.profiles.full_name = '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Set existing 'pending' profiles to 'approved' so they can sell
UPDATE public.profiles SET status = 'approved' WHERE status = 'pending';
