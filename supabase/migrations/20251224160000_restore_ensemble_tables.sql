-- Restore setlist_learning_status (dropped in 20241224120000, missed in 20251224150000)
CREATE TABLE IF NOT EXISTS setlist_learning_status (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    musician_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    setlist_item_id uuid REFERENCES setlist_items(id) ON DELETE CASCADE,
    learned boolean DEFAULT false,
    updated_at timestamptz DEFAULT now(),
    UNIQUE(musician_id, setlist_item_id)
);

ALTER TABLE setlist_learning_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own learning status" ON setlist_learning_status;
CREATE POLICY "Users can view own learning status"
    ON setlist_learning_status FOR SELECT
    USING (auth.uid() = musician_id);

DROP POLICY IF EXISTS "Users can update own learning status" ON setlist_learning_status;
CREATE POLICY "Users can update own learning status"
    ON setlist_learning_status FOR ALL
    USING (auth.uid() = musician_id)
    WITH CHECK (auth.uid() = musician_id);


-- Restore missing money fields in gig_roles (missed in 20251224150000)
ALTER TABLE gig_roles
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid', -- 'unpaid', 'paid', 'pending'
ADD COLUMN IF NOT EXISTS paid_amount numeric(10, 2),
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'ILS';

-- Backfill payment_status from is_paid if needed
UPDATE gig_roles
SET payment_status = CASE WHEN is_paid THEN 'paid' ELSE 'unpaid' END
WHERE payment_status = 'unpaid' AND is_paid IS TRUE;

