"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types/shared";

type UserContextType = {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start as true, show loading screen until auth resolves
  const hasFetchedRef = useRef(false);
  const userIdRef = useRef<string | undefined>(undefined);

  const fetchUserAndProfile = async () => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    try {
      const supabase = createClient();

      // Get the authenticated user first
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);
      userIdRef.current = authUser?.id;

      // Then fetch their profile by ID
      if (authUser) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .maybeSingle();

        setProfile(profileData);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error("Error fetching user/profile:", error);
      setUser(null);
      userIdRef.current = undefined;
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserAndProfile();

    // Listen for auth changes
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Only update if user actually changed (use ref to avoid stale closure)
      if (session?.user?.id !== userIdRef.current) {
        setUser(session?.user ?? null);
        userIdRef.current = session?.user?.id;
        if (session?.user) {
          // Reset flag to allow refetch for new user
          hasFetchedRef.current = false;
          fetchUserAndProfile();
        } else {
          setProfile(null);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refetch = async () => {
    setIsLoading(true);
    hasFetchedRef.current = false;
    await fetchUserAndProfile();
  };

  return (
    <UserContext.Provider value={{ user, profile, isLoading, refetch }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
}
