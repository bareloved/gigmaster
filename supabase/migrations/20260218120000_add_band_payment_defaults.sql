-- Add default payment fields to bands table
ALTER TABLE public.bands
  ADD COLUMN IF NOT EXISTS default_fee numeric,
  ADD COLUMN IF NOT EXISTS default_currency text,
  ADD COLUMN IF NOT EXISTS default_payment_method text;
