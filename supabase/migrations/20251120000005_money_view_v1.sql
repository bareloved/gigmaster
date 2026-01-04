-- Money View v1: Replace is_paid with payment_status system
-- Drop existing is_paid column
ALTER TABLE gig_roles DROP COLUMN IF EXISTS is_paid;

-- Add new payment fields
ALTER TABLE gig_roles ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE gig_roles ADD COLUMN paid_amount NUMERIC(10, 2);
ALTER TABLE gig_roles ADD COLUMN currency TEXT DEFAULT 'ILS';

-- Add check constraint for payment_status
ALTER TABLE gig_roles ADD CONSTRAINT payment_status_check 
  CHECK (payment_status IN ('pending', 'paid', 'partial', 'overdue'));

-- Add check constraint for paid_amount (must be >= 0 if not null)
ALTER TABLE gig_roles ADD CONSTRAINT paid_amount_check 
  CHECK (paid_amount IS NULL OR paid_amount >= 0);

-- Add index for payment queries
CREATE INDEX idx_gig_roles_payment_status ON gig_roles(payment_status);
CREATE INDEX idx_gig_roles_musician_payment ON gig_roles(musician_id, payment_status);

-- Note: paid_at already nullable, will only be set when payment_status is 'paid' or 'partial'

