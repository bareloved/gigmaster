-- Add currency field to gigs table
-- This allows managers to track what currency is being used per gig
ALTER TABLE public.gigs
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'ILS' NOT NULL;

-- Add a constraint to ensure valid currency codes
ALTER TABLE public.gigs
ADD CONSTRAINT valid_currency_code 
CHECK (currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'ILS'));

COMMENT ON COLUMN public.gigs.currency IS 'Currency code for this gig (ISO 4217). Defaults to ILS (Israeli New Shekel).';

