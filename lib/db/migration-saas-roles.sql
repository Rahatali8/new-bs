-- ============================================================
-- SAAS ROLES MIGRATION — Booker & Salesman login roles
-- Run ONCE in Supabase SQL Editor (fully idempotent)
--
-- Role model:
--   admins        -> SuperAdmin (SaaS owner, manages company admins)
--   pos_user      -> Admin (company owner, full access)
--   sub_pos_user  -> Generic staff with module privileges
--   booker        -> Creates sales/credit; sees only his own parties' udhaar
--   salesman      -> Linked to a booker; recovers payments (collections)
-- ============================================================

-- 1. Allow new roles on pos_users
ALTER TABLE pos_users DROP CONSTRAINT IF EXISTS pos_users_role_check;
ALTER TABLE pos_users ADD CONSTRAINT pos_users_role_check
  CHECK (role IN ('pos_user', 'sub_pos_user', 'booker', 'salesman'));

-- 2. Link login users to a booker entity
--    booker role   -> the bookers row this login belongs to
--    salesman role -> the booker this salesman does recovery for
ALTER TABLE pos_users ADD COLUMN IF NOT EXISTS booker_id UUID REFERENCES bookers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_pos_users_booker_id ON pos_users(booker_id);

-- 3. Track which login created each sale
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES pos_users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sales_invoices_created_by ON sales_invoices(created_by);

-- 4. Track recovery: who collected each payment and for which booker
ALTER TABLE payments ADD COLUMN IF NOT EXISTS collected_by UUID REFERENCES pos_users(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS booker_id UUID REFERENCES bookers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_payments_collected_by ON payments(collected_by);
CREATE INDEX IF NOT EXISTS idx_payments_booker_id ON payments(booker_id);

-- 5. Backfill booker_id on existing payments from their invoice
UPDATE payments p
SET booker_id = si.booker_id
FROM sales_invoices si
WHERE p.invoice_id = si.id
  AND p.booker_id IS NULL
  AND si.booker_id IS NOT NULL;
