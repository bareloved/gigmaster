import { cache } from "react";
import { createClient } from "./server";

/**
 * Get profile for a user
 * Uses React cache() to deduplicate requests within a single render
 * Returns null if profile doesn't exist (gracefully handles missing profiles)
 */
export const getProfile = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle(); // Use maybeSingle to handle missing profiles

  if (error) return null;
  return data;
});

/**
 * Get current authenticated user
 * Uses React cache() to deduplicate auth checks
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) return null;
  return user;
});

