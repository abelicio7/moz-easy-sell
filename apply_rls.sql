ALTER TABLE seller_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own integrations" ON seller_integrations;
CREATE POLICY "Users can view their own integrations"
  ON seller_integrations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own integrations" ON seller_integrations;
CREATE POLICY "Users can insert their own integrations"
  ON seller_integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own integrations" ON seller_integrations;
CREATE POLICY "Users can update their own integrations"
  ON seller_integrations FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own integrations" ON seller_integrations;
CREATE POLICY "Users can delete their own integrations"
  ON seller_integrations FOR DELETE
  USING (auth.uid() = user_id);
