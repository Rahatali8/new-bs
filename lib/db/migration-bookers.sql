-- Add bookers table
CREATE TABLE IF NOT EXISTS bookers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES pos_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bookers_user_id ON bookers(user_id);
CREATE INDEX IF NOT EXISTS idx_bookers_user_id_name ON bookers(user_id, name);

-- Add booker_id to sales_invoices
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS booker_id UUID REFERENCES bookers(id) ON DELETE SET NULL;
