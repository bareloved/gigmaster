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
  const [isLoading, setIsLoading] = useState(false); // Changed: Start as false, render immediately
  const hasFetchedRef = useRef(false);

  const fetchUserAndProfile = async () => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    
    try {
      const supabase = createClient();
      
      // OPTIMIZATION: Parallelize both API calls instead of sequential
      const [userResult, profileResult] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("profiles").select("*").limit(1).maybeSingle(),
      ]);

      const authUser = userResult.data.user;
      setUser(authUser);

      // Only set profile if it matches the current user
      if (authUser && profileResult.data?.id === authUser.id) {
        setProfile(profileResult.data);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error("Error fetching user/profile:", error);
      setUser(null);
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
      // Only update if user actually changed
      if (session?.user?.id !== user?.id) {
        setUser(session?.user ?? null);
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
