-- ============================================================
-- MASTER SCHEMA — POS Billing System
-- Run this ONCE in Supabase SQL Editor (fully idempotent)
-- ============================================================

-- ============================================================
-- 0. HELPER FUNCTION (required by all triggers below)
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================
-- 1. POS USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS pos_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('pos_user', 'sub_pos_user')),
  parent_user_id UUID REFERENCES pos_users(id) ON DELETE CASCADE,
  name TEXT,
  privileges JSONB NOT NULL DEFAULT '{
    "dashboard": false,
    "parties": false,
    "inventory": false,
    "inventory_report": false,
    "categories": false,
    "units": false,
    "barcode": false,
    "pos": false,
    "invoices_list": false,
    "accounts": false,
    "returns_refunds": false,
    "employees_payroll": false,
    "purchases": false,
    "backup": false,
    "user_management": false
  }'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_users_email ON pos_users(email);
CREATE INDEX IF NOT EXISTS idx_pos_users_parent_user_id ON pos_users(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_pos_users_role ON pos_users(role);

DROP TRIGGER IF EXISTS update_pos_users_updated_at ON pos_users;
CREATE TRIGGER update_pos_users_updated_at
  BEFORE UPDATE ON pos_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE pos_users DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. ADMINS TABLE (super-admin, separate from pos_users)
-- ============================================================
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_is_active ON admins(is_active);

DROP TRIGGER IF EXISTS update_admins_updated_at ON admins;
CREATE TRIGGER update_admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE admins DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. PARTIES TABLE (Customers & Vendors)
-- ============================================================
CREATE TABLE IF NOT EXISTS parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  type TEXT NOT NULL CHECK (type IN ('Customer', 'Vendor')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parties_type ON parties(type);
CREATE INDEX IF NOT EXISTS idx_parties_created_at ON parties(created_at DESC);

ALTER TABLE parties DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. CATEGORIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE categories DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. UNITS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_units_name ON units(name);

ALTER TABLE units DISABLE ROW LEVEL SECURITY;

INSERT INTO units (name, symbol) VALUES
  ('Piece', 'pcs'),
  ('Kilogram', 'kg'),
  ('Gram', 'g'),
  ('Liter', 'L'),
  ('Milliliter', 'mL'),
  ('Meter', 'm'),
  ('Centimeter', 'cm'),
  ('Box', 'box'),
  ('Pack', 'pack'),
  ('Dozen', 'doz')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. INVENTORY ITEMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  stock NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (stock >= 0),
  cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  selling_price NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
  cash_price NUMERIC(10, 2) CHECK (cash_price >= 0),
  credit_price NUMERIC(10, 2) CHECK (credit_price >= 0),
  supplier_price NUMERIC(10, 2) CHECK (supplier_price >= 0),
  profit_percentage NUMERIC(5, 2) DEFAULT 0 CHECK (profit_percentage >= 0),
  profit_value NUMERIC(10, 2) DEFAULT 0 CHECK (profit_value >= 0),
  minimum_stock NUMERIC(10, 2) DEFAULT 0 CHECK (minimum_stock >= 0),
  maximum_stock NUMERIC(10, 2) DEFAULT NULL CHECK (maximum_stock IS NULL OR maximum_stock >= 0),
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add all columns conditionally (safe for existing tables)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_items' AND column_name='category_id') THEN
    ALTER TABLE inventory_items ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_items' AND column_name='unit_id') THEN
    ALTER TABLE inventory_items ADD COLUMN unit_id UUID REFERENCES units(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_items' AND column_name='barcode') THEN
    ALTER TABLE inventory_items ADD COLUMN barcode TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_items' AND column_name='cost_price') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_items' AND column_name='unit_price') THEN
      ALTER TABLE inventory_items RENAME COLUMN unit_price TO cost_price;
    ELSE
      ALTER TABLE inventory_items ADD COLUMN cost_price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0);
    END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_items' AND column_name='selling_price') THEN
    ALTER TABLE inventory_items ADD COLUMN selling_price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (selling_price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_items' AND column_name='cash_price') THEN
    ALTER TABLE inventory_items ADD COLUMN cash_price NUMERIC(10,2) CHECK (cash_price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_items' AND column_name='credit_price') THEN
    ALTER TABLE inventory_items ADD COLUMN credit_price NUMERIC(10,2) CHECK (credit_price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_items' AND column_name='supplier_price') THEN
    ALTER TABLE inventory_items ADD COLUMN supplier_price NUMERIC(10,2) CHECK (supplier_price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_items' AND column_name='profit_percentage') THEN
    ALTER TABLE inventory_items ADD COLUMN profit_percentage NUMERIC(5,2) DEFAULT 0 CHECK (profit_percentage >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_items' AND column_name='profit_value') THEN
    ALTER TABLE inventory_items ADD COLUMN profit_value NUMERIC(10,2) DEFAULT 0 CHECK (profit_value >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_items' AND column_name='minimum_stock') THEN
    ALTER TABLE inventory_items ADD COLUMN minimum_stock NUMERIC(10,2) DEFAULT 0 CHECK (minimum_stock >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_items' AND column_name='maximum_stock') THEN
    ALTER TABLE inventory_items ADD COLUMN maximum_stock NUMERIC(10,2) DEFAULT NULL CHECK (maximum_stock IS NULL OR maximum_stock >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_items' AND column_name='is_archived') THEN
    ALTER TABLE inventory_items ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_items_barcode_key') THEN
    IF NOT EXISTS (
      SELECT barcode FROM inventory_items WHERE barcode IS NOT NULL GROUP BY barcode HAVING COUNT(*) > 1
    ) THEN
      ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_barcode_key UNIQUE (barcode);
    END IF;
  END IF;

  -- Only add stock_range_check if both columns exist (table may be pre-existing without them)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_items' AND column_name='maximum_stock'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_items' AND column_name='minimum_stock'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_items_stock_range_check'
  ) THEN
    ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_stock_range_check
      CHECK (maximum_stock IS NULL OR maximum_stock >= minimum_stock);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_inventory_items_name ON inventory_items(name);
CREATE INDEX IF NOT EXISTS idx_inventory_items_created_at ON inventory_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_items_stock ON inventory_items(stock) WHERE stock < 5;
CREATE INDEX IF NOT EXISTS idx_inventory_items_category_id ON inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_barcode ON inventory_items(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_items_unit_id ON inventory_items(unit_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_is_archived ON inventory_items(is_archived) WHERE is_archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_inventory_items_cash_price ON inventory_items(cash_price) WHERE cash_price IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_items_credit_price ON inventory_items(credit_price) WHERE credit_price IS NOT NULL;

ALTER TABLE inventory_items DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 7. STOCK MOVEMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('IN', 'OUT')),
  quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
  reference_type TEXT CHECK (reference_type IN ('Invoice', 'Purchase', 'Adjustment', 'Manual', 'SaleReturn', 'PurchaseReturn')),
  reference_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update constraint if table existed with old values
ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_reference_type_check;
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_reference_type_check
  CHECK (reference_type IN ('Invoice', 'Purchase', 'Adjustment', 'Manual', 'SaleReturn', 'PurchaseReturn'));

CREATE INDEX IF NOT EXISTS idx_stock_movements_item_id ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);

ALTER TABLE stock_movements DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8. SALES INVOICES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS sales_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  total NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  status TEXT NOT NULL DEFAULT 'Draft',
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'pos')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fix status constraint (expanded set)
ALTER TABLE sales_invoices DROP CONSTRAINT IF EXISTS sales_invoices_status_check;
ALTER TABLE sales_invoices ADD CONSTRAINT sales_invoices_status_check
  CHECK (status IN ('Draft', 'Paid', 'Pending', 'Credit', 'Cancelled', 'Returned', 'Partially Returned'));

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sales_invoices' AND column_name='source') THEN
    ALTER TABLE sales_invoices ADD COLUMN source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'pos'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sales_invoices' AND column_name='discount') THEN
    ALTER TABLE sales_invoices ADD COLUMN discount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sales_invoices_party_id ON sales_invoices(party_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_status ON sales_invoices(status);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_created_at ON sales_invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_total ON sales_invoices(total);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_source ON sales_invoices(source) WHERE source = 'pos';

DROP TRIGGER IF EXISTS update_sales_invoices_updated_at ON sales_invoices;
CREATE TRIGGER update_sales_invoices_updated_at
  BEFORE UPDATE ON sales_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE sales_invoices DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 9. SALES INVOICE LINES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS sales_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  line_total NUMERIC(10, 2) NOT NULL CHECK (line_total >= 0),
  cost_price NUMERIC(10, 2) NULL CHECK (cost_price >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sales_invoice_lines' AND column_name='cost_price') THEN
    ALTER TABLE sales_invoice_lines ADD COLUMN cost_price NUMERIC(10,2) NULL CHECK (cost_price >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sales_invoice_lines_invoice_id ON sales_invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_lines_item_id ON sales_invoice_lines(item_id);

ALTER TABLE sales_invoice_lines DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 10. PURCHASE INVOICES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  total NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  status TEXT NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE purchase_invoices DROP CONSTRAINT IF EXISTS purchase_invoices_status_check;
ALTER TABLE purchase_invoices ADD CONSTRAINT purchase_invoices_status_check
  CHECK (status IN ('Draft', 'Paid', 'Pending', 'Cancelled', 'Returned', 'Partially Returned'));

CREATE INDEX IF NOT EXISTS idx_purchase_invoices_party_id ON purchase_invoices(party_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_status ON purchase_invoices(status);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_created_at ON purchase_invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_total ON purchase_invoices(total);

DROP TRIGGER IF EXISTS update_purchase_invoices_updated_at ON purchase_invoices;
CREATE TRIGGER update_purchase_invoices_updated_at
  BEFORE UPDATE ON purchase_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE purchase_invoices DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 11. PURCHASE INVOICE LINES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_invoice_id UUID NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  line_total NUMERIC(10, 2) NOT NULL CHECK (line_total >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_invoice_lines_purchase_invoice_id ON purchase_invoice_lines(purchase_invoice_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_lines_item_id ON purchase_invoice_lines(item_id);

ALTER TABLE purchase_invoice_lines DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 12. PAYMENTS TABLE (sales)
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL CHECK (method IN ('Cash', 'Card', 'JazzCash', 'EasyPaisa', 'Mixed', 'Other')),
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

ALTER TABLE payments DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 13. PURCHASE PAYMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_invoice_id UUID NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL CHECK (method IN ('Cash', 'Card', 'JazzCash', 'EasyPaisa', 'Mixed', 'Other')),
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_payments_purchase_invoice_id ON purchase_payments(purchase_invoice_id);
CREATE INDEX IF NOT EXISTS idx_purchase_payments_created_at ON purchase_payments(created_at DESC);

ALTER TABLE purchase_payments DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 14. RETURNS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sale', 'purchase')),
  sales_invoice_id UUID REFERENCES sales_invoices(id) ON DELETE RESTRICT,
  purchase_invoice_id UUID REFERENCES purchase_invoices(id) ON DELETE RESTRICT,
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  total NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Completed', 'Cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT returns_invoice_check CHECK (
    (type = 'sale' AND sales_invoice_id IS NOT NULL AND purchase_invoice_id IS NULL) OR
    (type = 'purchase' AND purchase_invoice_id IS NOT NULL AND sales_invoice_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_returns_type ON returns(type);
CREATE INDEX IF NOT EXISTS idx_returns_sales_invoice_id ON returns(sales_invoice_id) WHERE sales_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_returns_purchase_invoice_id ON returns(purchase_invoice_id) WHERE purchase_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_returns_party_id ON returns(party_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
CREATE INDEX IF NOT EXISTS idx_returns_created_at ON returns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_returns_return_number ON returns(return_number);

DROP TRIGGER IF EXISTS update_returns_updated_at ON returns;
CREATE TRIGGER update_returns_updated_at
  BEFORE UPDATE ON returns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE returns DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 15. RETURN LINES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS return_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  line_total NUMERIC(10, 2) NOT NULL CHECK (line_total >= 0),
  sales_invoice_line_id UUID REFERENCES sales_invoice_lines(id) ON DELETE SET NULL,
  purchase_invoice_line_id UUID REFERENCES purchase_invoice_lines(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_return_lines_return_id ON return_lines(return_id);
CREATE INDEX IF NOT EXISTS idx_return_lines_item_id ON return_lines(item_id);

ALTER TABLE return_lines DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 16. REFUNDS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL CHECK (method IN ('Cash', 'Card', 'JazzCash', 'EasyPaisa', 'Mixed', 'Other')),
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refunds_return_id ON refunds(return_id);
CREATE INDEX IF NOT EXISTS idx_refunds_created_at ON refunds(created_at DESC);

ALTER TABLE refunds DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 17. EXPENSES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES pos_users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL DEFAULT 'Other',
  description TEXT,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date);

ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 18. EMPLOYEES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES pos_users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  designation TEXT,
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
  bank_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_created_at ON employees(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email) WHERE email IS NOT NULL;

DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE employees DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 19. EMPLOYEE SALARIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS employee_salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  effective_from DATE NOT NULL,
  basic_salary NUMERIC(10, 2) NOT NULL CHECK (basic_salary >= 0),
  allowances JSONB DEFAULT '[]'::jsonb,
  deductions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_salaries_employee_id ON employee_salaries(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_salaries_effective_from ON employee_salaries(employee_id, effective_from DESC);

ALTER TABLE employee_salaries DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 20. EMPLOYEE LEDGER ENTRIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS employee_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  debit NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  reference_type TEXT CHECK (reference_type IN ('salary_payment', 'advance', 'adjustment', 'other')),
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_ledger_entries_employee_id ON employee_ledger_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_ledger_entries_entry_date ON employee_ledger_entries(entry_date DESC);

ALTER TABLE employee_ledger_entries DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 21. PAYROLL RUNS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processed', 'paid')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  UNIQUE(month)
);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_month ON payroll_runs(month DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_status ON payroll_runs(status);

ALTER TABLE payroll_runs DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 22. PAYROLL LINES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS payroll_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  gross NUMERIC(10, 2) NOT NULL CHECK (gross >= 0),
  deductions NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (deductions >= 0),
  net NUMERIC(10, 2) NOT NULL CHECK (net >= 0),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  paid_at TIMESTAMPTZ,
  ledger_entry_id UUID REFERENCES employee_ledger_entries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(payroll_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_lines_payroll_id ON payroll_lines(payroll_id);
CREATE INDEX IF NOT EXISTS idx_payroll_lines_employee_id ON payroll_lines(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_lines_payment_status ON payroll_lines(payment_status);

ALTER TABLE payroll_lines DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 23. CASH BOOK SETTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS cash_book_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES pos_users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  opening_balance_override NUMERIC(10, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_cash_book_settings_user_date ON cash_book_settings(user_id, date);

DROP TRIGGER IF EXISTS update_cash_book_settings_updated_at ON cash_book_settings;
CREATE TRIGGER update_cash_book_settings_updated_at
  BEFORE UPDATE ON cash_book_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE cash_book_settings DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 24. USER SETTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES pos_users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 25. ADD user_id TO ALL TABLES (multi-tenant isolation)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='parties' AND column_name='user_id') THEN
    ALTER TABLE parties ADD COLUMN user_id UUID REFERENCES pos_users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_parties_user_id ON parties(user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categories' AND column_name='user_id') THEN
    ALTER TABLE categories ADD COLUMN user_id UUID REFERENCES pos_users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='categories_name_key') THEN
      ALTER TABLE categories DROP CONSTRAINT categories_name_key;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='categories_name_user_id_key') THEN
      ALTER TABLE categories ADD CONSTRAINT categories_name_user_id_key UNIQUE (name, user_id);
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_items' AND column_name='user_id') THEN
    ALTER TABLE inventory_items ADD COLUMN user_id UUID REFERENCES pos_users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_inventory_items_user_id ON inventory_items(user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stock_movements' AND column_name='user_id') THEN
    ALTER TABLE stock_movements ADD COLUMN user_id UUID REFERENCES pos_users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_stock_movements_user_id ON stock_movements(user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sales_invoices' AND column_name='user_id') THEN
    ALTER TABLE sales_invoices ADD COLUMN user_id UUID REFERENCES pos_users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_sales_invoices_user_id ON sales_invoices(user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='purchase_invoices' AND column_name='user_id') THEN
    ALTER TABLE purchase_invoices ADD COLUMN user_id UUID REFERENCES pos_users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_purchase_invoices_user_id ON purchase_invoices(user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='user_id') THEN
    ALTER TABLE payments ADD COLUMN user_id UUID REFERENCES pos_users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='purchase_payments' AND column_name='user_id') THEN
    ALTER TABLE purchase_payments ADD COLUMN user_id UUID REFERENCES pos_users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_purchase_payments_user_id ON purchase_payments(user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='returns' AND column_name='user_id') THEN
    ALTER TABLE returns ADD COLUMN user_id UUID REFERENCES pos_users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_returns_user_id ON returns(user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='refunds' AND column_name='user_id') THEN
    ALTER TABLE refunds ADD COLUMN user_id UUID REFERENCES pos_users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON refunds(user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='units' AND column_name='user_id') THEN
    ALTER TABLE units ADD COLUMN user_id UUID REFERENCES pos_users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_units_user_id ON units(user_id);
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='units_name_key') THEN
      ALTER TABLE units DROP CONSTRAINT units_name_key;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='units_name_user_id_key') THEN
      ALTER TABLE units ADD CONSTRAINT units_name_user_id_key UNIQUE (name, user_id);
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='employees' AND column_name='user_id') THEN
    -- user_id already in CREATE TABLE above, this is a no-op guard
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='employee_salaries' AND column_name='user_id') THEN
    ALTER TABLE employee_salaries ADD COLUMN user_id UUID REFERENCES pos_users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_employee_salaries_user_id ON employee_salaries(user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payroll_runs' AND column_name='user_id') THEN
    ALTER TABLE payroll_runs ADD COLUMN user_id UUID REFERENCES pos_users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_payroll_runs_user_id ON payroll_runs(user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payroll_lines' AND column_name='user_id') THEN
    ALTER TABLE payroll_lines ADD COLUMN user_id UUID REFERENCES pos_users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_payroll_lines_user_id ON payroll_lines(user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='employee_ledger_entries' AND column_name='user_id') THEN
    ALTER TABLE employee_ledger_entries ADD COLUMN user_id UUID REFERENCES pos_users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_employee_ledger_entries_user_id ON employee_ledger_entries(user_id);
  END IF;
END $$;

-- ============================================================
-- 26. RPC FUNCTIONS (atomic stock operations)
-- ============================================================
CREATE OR REPLACE FUNCTION decrement_inventory_stock(
  item_id UUID,
  quantity NUMERIC
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE inventory_items
  SET stock = stock - quantity
  WHERE id = item_id
    AND stock >= quantity;

  IF NOT FOUND THEN
    IF NOT EXISTS (SELECT 1 FROM inventory_items WHERE id = item_id) THEN
      RAISE EXCEPTION 'Item not found: %', item_id;
    ELSE
      RAISE EXCEPTION 'Insufficient stock for item %', item_id;
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION increment_inventory_stock(
  item_id UUID,
  quantity NUMERIC
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE inventory_items
  SET stock = stock + quantity
  WHERE id = item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found: %', item_id;
  END IF;
END;
$$;

-- ============================================================
-- 27. RETURN NUMBER AUTO-GENERATE
-- ============================================================
CREATE OR REPLACE FUNCTION generate_return_number()
RETURNS TEXT AS $$
DECLARE
  prefix TEXT := 'RET-';
  year_part TEXT := TO_CHAR(NOW(), 'YYYY');
  last_num INTEGER;
  new_num INTEGER;
  return_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(return_number FROM LENGTH(prefix) + 5 FOR 6) AS INTEGER)), 0)
  INTO last_num
  FROM returns
  WHERE return_number LIKE prefix || year_part || '-%';

  new_num := last_num + 1;
  return_num := prefix || year_part || '-' || LPAD(new_num::TEXT, 6, '0');
  RETURN return_num;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_return_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.return_number IS NULL OR NEW.return_number = '' THEN
    NEW.return_number := generate_return_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_return_number_trigger ON returns;
CREATE TRIGGER set_return_number_trigger
  BEFORE INSERT ON returns
  FOR EACH ROW
  EXECUTE FUNCTION set_return_number();

-- ============================================================
-- 28. PERFORMANCE INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_inventory_items_user_id_created_at ON inventory_items(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_items_user_id_barcode ON inventory_items(user_id, barcode);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_user_id_created_at ON sales_invoices(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_user_id_status ON sales_invoices(user_id, status);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_user_id_created_at ON purchase_invoices(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_user_id_status ON purchase_invoices(user_id, status);
CREATE INDEX IF NOT EXISTS idx_parties_user_id_created_at ON parties(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parties_user_id_name ON parties(user_id, name);
CREATE INDEX IF NOT EXISTS idx_stock_movements_user_id_created_at ON stock_movements(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_returns_user_id_created_at ON returns(user_id, created_at DESC);
