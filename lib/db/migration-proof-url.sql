-- Add proof_url column to sales_invoices for opening balance bill images
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS proof_url TEXT;

-- Create storage bucket for balance proofs (run this in Supabase SQL editor)
-- NOTE: After running this SQL, also go to Storage in Supabase Dashboard
-- and create a bucket named "balance-proofs" (set to Public so images can be viewed)
