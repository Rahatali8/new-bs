-- System Invoices table for SaaS subscription billing
CREATE TABLE IF NOT EXISTS system_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_no TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  plan TEXT NOT NULL,
  period TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
