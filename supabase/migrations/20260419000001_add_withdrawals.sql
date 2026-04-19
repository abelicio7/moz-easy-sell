-- Create table for withdrawals
CREATE TABLE withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  payment_method TEXT NOT NULL, -- e.g., 'm-pesa', 'e-mola', 'bank'
  payment_details TEXT NOT NULL, -- the phone number or bank account
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- Policies for withdrawals
CREATE POLICY "Users can view their own withdrawals"
  ON withdrawals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can request their own withdrawals"
  ON withdrawals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Normally, users cannot update their withdrawals once requested to prevent fraud, 
-- or they can cancel it if 'pending'. We'll leave it out for now.
-- Admins will have a role to do updates.

-- Trigger to update timestamp
CREATE TRIGGER update_withdrawals_updated_at
BEFORE UPDATE ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
