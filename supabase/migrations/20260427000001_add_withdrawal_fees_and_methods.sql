-- Update withdrawals table with fee columns
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS fee_amount NUMERIC DEFAULT 0;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS net_amount NUMERIC DEFAULT 0;

-- Create table for saved withdrawal methods
CREATE TABLE IF NOT EXISTS withdrawal_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  method_type TEXT NOT NULL, -- 'M-Pesa', 'E-Mola', 'Bank'
  account_name TEXT NOT NULL, -- Name associated with the account
  account_number TEXT NOT NULL, -- Phone number or account number
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for withdrawal_methods
ALTER TABLE withdrawal_methods ENABLE ROW LEVEL SECURITY;

-- Policies for withdrawal_methods
CREATE POLICY "Users can manage their own withdrawal methods"
  ON withdrawal_methods FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add sample data for existing users (optional, skip)
