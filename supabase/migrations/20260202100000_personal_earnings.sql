-- Add personal earnings tracking to gig_roles
ALTER TABLE public.gig_roles
  ADD COLUMN IF NOT EXISTS personal_earnings_amount numeric,
  ADD COLUMN IF NOT EXISTS personal_earnings_currency text DEFAULT 'ILS',
  ADD COLUMN IF NOT EXISTS personal_earnings_notes text,
  ADD COLUMN IF NOT EXISTS personal_earnings_paid_at timestamptz;

-- Comments for documentation
COMMENT ON COLUMN public.gig_roles.personal_earnings_amount IS 'Self-reported earnings amount (separate from manager-set agreed_fee)';
COMMENT ON COLUMN public.gig_roles.personal_earnings_currency IS 'Currency for personal earnings tracking';
COMMENT ON COLUMN public.gig_roles.personal_earnings_notes IS 'Notes about personal earnings/payment';
COMMENT ON COLUMN public.gig_roles.personal_earnings_paid_at IS 'When personal earnings were received';
