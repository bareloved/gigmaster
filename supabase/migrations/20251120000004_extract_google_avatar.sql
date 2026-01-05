-- Update the profile trigger function to extract Google avatar from OAuth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, main_instrument, avatar_url, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    NEW.raw_user_meta_data->>'main_instrument',
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    ),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The trigger already exists from migration 20241112000001_profile_trigger.sql
-- This migration only updates the function to handle avatar extraction

