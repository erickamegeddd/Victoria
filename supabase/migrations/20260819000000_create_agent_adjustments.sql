-- Agent adjustments audit table
-- Run once against production Supabase to enable adjustment tracking.

CREATE TABLE IF NOT EXISTS agent_adjustments (
  id            bigserial PRIMARY KEY,
  agent_name    text        NOT NULL,
  report_month  date        NOT NULL,
  mid           text,
  field_name    text        NOT NULL,
  original_value numeric,
  adjusted_value numeric    NOT NULL,
  notes         text,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE agent_adjustments ENABLE ROW LEVEL SECURITY;

-- Anon key can insert and read (needed by Vercel API)
CREATE POLICY "agent_adjustments_insert" ON agent_adjustments
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "agent_adjustments_select" ON agent_adjustments
  FOR SELECT TO anon USING (true);
