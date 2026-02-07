import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types/shared";

/**
 * Mock Supabase Auth user
 */
export const mockUser: User = {
  id: "test-user-id-123",
  email: "test@example.com",
  app_metadata: {},
  user_metadata: { name: "Test User" },
  aud: "authenticated",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  phone: "",
  confirmed_at: "2024-01-01T00:00:00Z",
  email_confirmed_at: "2024-01-01T00:00:00Z",
  last_sign_in_at: "2024-01-01T00:00:00Z",
  role: "authenticated",
  identities: [],
  factors: [],
};

/**
 * Mock user profile from profiles table
 */
export const mockProfile: Profile = {
  id: "test-user-id-123",
  name: "Test User",
  email: "test@example.com",
  avatar_url: null,
  main_instrument: "Keys",
  phone: null,
  default_country_code: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

/**
 * Another mock user for testing multi-user scenarios
 */
export const mockUser2: User = {
  id: "test-user-id-456",
  email: "musician@example.com",
  app_metadata: {},
  user_metadata: { name: "Jane Musician" },
  aud: "authenticated",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  phone: "",
  confirmed_at: "2024-01-01T00:00:00Z",
  email_confirmed_at: "2024-01-01T00:00:00Z",
  last_sign_in_at: "2024-01-01T00:00:00Z",
  role: "authenticated",
  identities: [],
  factors: [],
};

export const mockProfile2: Profile = {
  id: "test-user-id-456",
  name: "Jane Musician",
  email: "musician@example.com",
  avatar_url: null,
  main_instrument: "Bass",
  phone: "+1234567890",
  default_country_code: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};
