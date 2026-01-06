"use client";

import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/lib/providers/user-provider";
import { createClient } from "@/lib/supabase/client";

interface ContactAvatarResult {
  avatarUrl: string | null;
  isLinkedUser: boolean;
  primaryInstrument: string | null;
  contactId: string | null;
}

/**
 * Look up contact avatar by name
 * Searches in order:
 * 1. My Circle contacts (may have linked user with avatar)
 * 2. System user profiles (for Ensemble users not in contacts)
 */
export function useContactAvatarLookup(name: string): ContactAvatarResult & { isLoading: boolean } {
  const { user } = useUser();

  const { data, isLoading } = useQuery({
    queryKey: ["contact-avatar-lookup", user?.id, name.trim().toLowerCase()],
    queryFn: async () => {
      if (!user || !name.trim()) {
        return null;
      }

      const supabase = createClient();
      const trimmedName = name.trim();

      // 1. First, try to find in My Circle contacts
      const { data: contact } = await supabase
        .from("musician_contacts")
        .select("id, linked_user_id, primary_instrument, status")
        .eq("user_id", user.id)
        .ilike("contact_name", trimmedName)
        .maybeSingle();

      if (contact) {
        let avatarUrl: string | null = null;
        let isLinkedUser = contact.status === "active_user";

        // If contact has a linked user, fetch their profile for avatar
        if (contact.linked_user_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("avatar_url")
            .eq("id", contact.linked_user_id)
            .maybeSingle();

          avatarUrl = profile?.avatar_url || null;
        }

        // If no avatar yet, try to find a profile by matching name
        if (!avatarUrl) {
          const { data: profileByName } = await supabase
            .from("profiles")
            .select("id, avatar_url")
            .ilike("name", trimmedName)
            .maybeSingle();

          if (profileByName?.avatar_url) {
            avatarUrl = profileByName.avatar_url;
            isLinkedUser = true;
          }
        }

        return {
          avatarUrl,
          isLinkedUser,
          primaryInstrument: contact.primary_instrument,
          contactId: contact.id,
        };
      }

      // 2. Not in contacts - search system profiles directly by name
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, avatar_url, main_instrument")
        .ilike("name", trimmedName)
        .neq("id", user.id) // Exclude current user
        .maybeSingle();

      if (profile) {
        return {
          avatarUrl: profile.avatar_url,
          isLinkedUser: true, // They're a system user
          primaryInstrument: profile.main_instrument,
          contactId: null,
        };
      }

      return null;
    },
    enabled: !!user && name.trim().length > 0,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return {
    avatarUrl: data?.avatarUrl || null,
    isLinkedUser: data?.isLinkedUser || false,
    primaryInstrument: data?.primaryInstrument || null,
    contactId: data?.contactId || null,
    isLoading,
  };
}
