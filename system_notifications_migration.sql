-- ============================================================
-- Rolyang: system_notifications table + RLS
-- Run this in your Supabase SQL Editor if not already created
-- ============================================================

-- Create table (safe to run if it already exists)
CREATE TABLE IF NOT EXISTS system_notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'global',     -- 'global' | 'direct'
  recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'sent',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist (safe to rerun)
DROP POLICY IF EXISTS "Global notifications are public" ON system_notifications;
DROP POLICY IF EXISTS "Users can see their direct notifications" ON system_notifications;

-- Allow anon/public to read global broadcasts (no auth needed)
CREATE POLICY "Global notifications are public" ON system_notifications
  FOR SELECT USING (type = 'global');

-- Authenticated users can also see their own direct notifications
CREATE POLICY "Users can see their direct notifications" ON system_notifications
  FOR SELECT USING (auth.uid() = recipient_id);

-- Enable Realtime for this table so the music app can subscribe live
ALTER PUBLICATION supabase_realtime ADD TABLE system_notifications;
