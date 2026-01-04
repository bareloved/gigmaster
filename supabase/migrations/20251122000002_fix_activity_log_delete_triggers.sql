-- Fix activity log triggers to handle gig deletion gracefully
-- When a gig is deleted, related records are deleted via CASCADE,
-- and their DELETE triggers try to insert activity log entries.
-- We need to check if the gig still exists before inserting.

-- Function: Log setlist changes (updated to check gig exists)
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
    -- Only log if the gig still exists (not being deleted)
    IF EXISTS (SELECT 1 FROM gigs WHERE id = OLD.gig_id) THEN
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
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Log file changes (updated to check gig exists)
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
    -- Only log if the gig still exists (not being deleted)
    IF EXISTS (SELECT 1 FROM gigs WHERE id = OLD.gig_id) THEN
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
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Log role changes (updated to check gig exists)
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
    -- Only log if the gig still exists (not being deleted)
    IF EXISTS (SELECT 1 FROM gigs WHERE id = OLD.gig_id) THEN
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
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

