-- Add payment tracking fields to gig_roles
-- These are manager-set fields visible to the musician whose role it is

ALTER TABLE public.gig_roles
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS expected_payment_date date;

COMMENT ON COLUMN public.gig_roles.payment_method IS 'Payment method set by manager: Cash, Bank Transfer, Bit, PayBox, Check, PayPal, Other';
COMMENT ON COLUMN public.gig_roles.expected_payment_date IS 'Expected payment date set by manager';
