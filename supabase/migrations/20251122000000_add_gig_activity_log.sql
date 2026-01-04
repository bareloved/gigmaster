-- =====================================================
-- GIG ACTIVITY LOG SYSTEM
-- Tracks all changes to gigs for activity feed
-- =====================================================

-- Create gig_activity_log table
CREATE TABLE IF NOT EXISTS gig_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL CHECK (
    activity_type IN (
      'setlist_added',
      'setlist_removed',
      'setlist_updated',
      'setlist_reordered',
      'file_uploaded',
      'file_removed',
      'file_updated',
      'role_assigned',
      'role_removed',
      'role_status_changed',
      'gig_updated',
      'notes_updated',
      'schedule_updated',
      'gig_created'
    )
  ),
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for fast queries
CREATE INDEX idx_gig_activity_log_gig_id ON gig_activity_log(gig_id);
CREATE INDEX idx_gig_activity_log_created_at ON gig_activity_log(created_at DESC);
CREATE INDEX idx_gig_activity_log_activity_type ON gig_activity_log(activity_type);

-- Enable RLS
ALTER TABLE gig_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view activity for gigs they're involved in
CREATE POLICY "Users can view activity for their gigs"
  ON gig_activity_log
  FOR SELECT
  USING (
    -- User is involved in the gig (either as manager or player)
    EXISTS (
      SELECT 1 FROM gigs g
      LEFT JOIN projects p ON g.project_id = p.id
      LEFT JOIN gig_roles gr ON g.id = gr.gig_id
      WHERE g.id = gig_activity_log.gig_id
        AND (
          p.owner_id = auth.uid() 
          OR gr.musician_id = auth.uid()
        )
    )
  );

-- RLS Policy: System can insert activity (no user restriction on insert)
CREATE POLICY "Allow inserts for activity logging"
  ON gig_activity_log
  FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- TRIGGERS FOR AUTO-LOGGING CHANGES
-- =====================================================

-- Function: Log setlist changes
CREATE OR REPLACE FUNCTION log_setlist_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO gig_activity_log (gig_id, user_id, activity_type, description, metadata)
    VALUES (
      NEW.gig_id,
      auth.uid(),
      'setlist_added',
      'Added "' || NEW.title || '" to setlist',
      jsonb_build_object(
        'setlist_item_id', NEW.id,
        'title', NEW.title,
        'position', NEW.position
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only log if title, key, or bpm changed (not just position reordering)
    IF NEW.title != OLD.title OR NEW.key IS DISTINCT FROM OLD.key OR NEW.bpm IS DISTINCT FROM OLD.bpm THEN
      INSERT INTO gig_activity_log (gig_id, user_id, activity_type, description, metadata)
      VALUES (
        NEW.gig_id,
        auth.uid(),
        'setlist_updated',
        'Updated "' || NEW.title || '"',
        jsonb_build_object(
          'setlist_item_id', NEW.id,
          'title', NEW.title,
          'old_title', OLD.title,
          'changes', jsonb_build_object(
            'title_changed', NEW.title != OLD.title,
            'key_changed', NEW.key IS DISTINCT FROM OLD.key,
            'bpm_changed', NEW.bpm IS DISTINCT FROM OLD.bpm
          )
        )
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO gig_activity_log (gig_id, user_id, activity_type, description, metadata)
    VALUES (
      OLD.gig_id,
      auth.uid(),
      'setlist_removed',
      'Removed "' || OLD.title || '" from setlist',
      jsonb_build_object(
        'title', OLD.title,
        'position', OLD.position
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to setlist_items
DROP TRIGGER IF EXISTS setlist_activity_trigger ON setlist_items;
CREATE TRIGGER setlist_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON setlist_items
  FOR EACH ROW
  EXECUTE FUNCTION log_setlist_activity();

-- Function: Log file changes
CREATE OR REPLACE FUNCTION log_file_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO gig_activity_log (gig_id, user_id, activity_type, description, metadata)
    VALUES (
      NEW.gig_id,
      auth.uid(),
      'file_uploaded',
      'Uploaded file "' || NEW.label || '"',
      jsonb_build_object(
        'file_id', NEW.id,
        'label', NEW.label,
        'type', NEW.type,
        'url', NEW.url
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO gig_activity_log (gig_id, user_id, activity_type, description, metadata)
    VALUES (
      NEW.gig_id,
      auth.uid(),
      'file_updated',
      'Updated file "' || NEW.label || '"',
      jsonb_build_object(
        'file_id', NEW.id,
        'label', NEW.label,
        'old_label', OLD.label
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO gig_activity_log (gig_id, user_id, activity_type, description, metadata)
    VALUES (
      OLD.gig_id,
      auth.uid(),
      'file_removed',
      'Removed file "' || OLD.label || '"',
      jsonb_build_object(
        'label', OLD.label,
        'type', OLD.type
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to gig_files
DROP TRIGGER IF EXISTS gig_files_activity_trigger ON gig_files;
CREATE TRIGGER gig_files_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON gig_files
  FOR EACH ROW
  EXECUTE FUNCTION log_file_activity();

-- Function: Log role changes
CREATE OR REPLACE FUNCTION log_role_activity()
RETURNS TRIGGER AS $$
DECLARE
  musician_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get musician name
    SELECT name INTO musician_name FROM profiles WHERE id = NEW.musician_id;
    IF musician_name IS NULL THEN
      musician_name := NEW.musician_name;
    END IF;
    
    INSERT INTO gig_activity_log (gig_id, user_id, activity_type, description, metadata)
    VALUES (
      NEW.gig_id,
      auth.uid(),
      'role_assigned',
      'Assigned ' || COALESCE(musician_name, 'musician') || ' to ' || NEW.role_name,
      jsonb_build_object(
        'role_id', NEW.id,
        'role_name', NEW.role_name,
        'musician_id', NEW.musician_id,
        'musician_name', musician_name
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log if musician changed
    IF NEW.musician_id IS DISTINCT FROM OLD.musician_id THEN
      SELECT name INTO musician_name FROM profiles WHERE id = NEW.musician_id;
      IF musician_name IS NULL THEN
        musician_name := NEW.musician_name;
      END IF;
      
      INSERT INTO gig_activity_log (gig_id, user_id, activity_type, description, metadata)
      VALUES (
        NEW.gig_id,
        auth.uid(),
        'role_assigned',
        'Changed ' || NEW.role_name || ' to ' || COALESCE(musician_name, 'musician'),
        jsonb_build_object(
          'role_id', NEW.id,
          'role_name', NEW.role_name,
          'musician_id', NEW.musician_id,
          'old_musician_id', OLD.musician_id,
          'musician_name', musician_name
        )
      );
    END IF;
    
    -- Log if status changed
    IF NEW.invitation_status != OLD.invitation_status THEN
      SELECT name INTO musician_name FROM profiles WHERE id = NEW.musician_id;
      IF musician_name IS NULL THEN
        musician_name := NEW.musician_name;
      END IF;
      
      INSERT INTO gig_activity_log (gig_id, user_id, activity_type, description, metadata)
      VALUES (
        NEW.gig_id,
        auth.uid(),
        'role_status_changed',
        COALESCE(musician_name, 'Musician') || ' ' || NEW.invitation_status || ' (' || NEW.role_name || ')',
        jsonb_build_object(
          'role_id', NEW.id,
          'role_name', NEW.role_name,
          'musician_id', NEW.musician_id,
          'old_status', OLD.invitation_status,
          'new_status', NEW.invitation_status
        )
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT name INTO musician_name FROM profiles WHERE id = OLD.musician_id;
    IF musician_name IS NULL THEN
      musician_name := OLD.musician_name;
    END IF;
    
    INSERT INTO gig_activity_log (gig_id, user_id, activity_type, description, metadata)
    VALUES (
      OLD.gig_id,
      auth.uid(),
      'role_removed',
      'Removed ' || OLD.role_name || ' role',
      jsonb_build_object(
        'role_name', OLD.role_name,
        'musician_name', musician_name
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to gig_roles
DROP TRIGGER IF EXISTS gig_roles_activity_trigger ON gig_roles;
CREATE TRIGGER gig_roles_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON gig_roles
  FOR EACH ROW
  EXECUTE FUNCTION log_role_activity();

-- Function: Log gig changes (notes, schedule)
CREATE OR REPLACE FUNCTION log_gig_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO gig_activity_log (gig_id, user_id, activity_type, description, metadata)
    VALUES (
      NEW.id,
      auth.uid(),
      'gig_created',
      'Created gig "' || NEW.title || '"',
      jsonb_build_object(
        'title', NEW.title,
        'date', NEW.date
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log notes changes
    IF NEW.notes IS DISTINCT FROM OLD.notes AND NEW.notes IS NOT NULL AND NEW.notes != '' THEN
      INSERT INTO gig_activity_log (gig_id, user_id, activity_type, description, metadata)
      VALUES (
        NEW.id,
        auth.uid(),
        'notes_updated',
        'Updated gig notes',
        jsonb_build_object(
          'notes_preview', LEFT(NEW.notes, 100)
        )
      );
    END IF;
    
    -- Log schedule changes
    IF NEW.schedule IS DISTINCT FROM OLD.schedule AND NEW.schedule IS NOT NULL THEN
      INSERT INTO gig_activity_log (gig_id, user_id, activity_type, description, metadata)
      VALUES (
        NEW.id,
        auth.uid(),
        'schedule_updated',
        'Updated gig schedule',
        jsonb_build_object(
          'schedule', NEW.schedule
        )
      );
    END IF;
    
    -- Log general updates (title, date, location)
    IF NEW.title != OLD.title OR NEW.date != OLD.date OR 
       NEW.location_name IS DISTINCT FROM OLD.location_name THEN
      INSERT INTO gig_activity_log (gig_id, user_id, activity_type, description, metadata)
      VALUES (
        NEW.id,
        auth.uid(),
        'gig_updated',
        'Updated gig details',
        jsonb_build_object(
          'title', NEW.title,
          'old_title', OLD.title,
          'date', NEW.date,
          'old_date', OLD.date,
          'changes', jsonb_build_object(
            'title_changed', NEW.title != OLD.title,
            'date_changed', NEW.date != OLD.date,
            'location_changed', NEW.location_name IS DISTINCT FROM OLD.location_name
          )
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to gigs
DROP TRIGGER IF EXISTS gig_updates_activity_trigger ON gigs;
CREATE TRIGGER gig_updates_activity_trigger
  AFTER INSERT OR UPDATE ON gigs
  FOR EACH ROW
  EXECUTE FUNCTION log_gig_updates();

-- Add comment
COMMENT ON TABLE gig_activity_log IS 'Tracks all changes to gigs for activity feed and audit trail';

