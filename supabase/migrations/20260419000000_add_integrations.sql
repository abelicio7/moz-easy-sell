-- Create table for seller integrations
CREATE TABLE seller_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL, -- e.g., 'webhook', 'pixel_facebook', 'google_analytics'
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate integration types for the same user
  UNIQUE(user_id, integration_type)
);

-- Enable RLS
ALTER TABLE seller_integrations ENABLE ROW LEVEL SECURITY;

-- Policies for seller_integrations
CREATE POLICY "Users can view their own integrations"
  ON seller_integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own integrations"
  ON seller_integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integrations"
  ON seller_integrations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own integrations"
  ON seller_integrations FOR DELETE
  USING (auth.uid() = user_id);
