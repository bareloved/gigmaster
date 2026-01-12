import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { User } from "@supabase/supabase-js";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getUserDisplayName(
  profile?: { name: string | null } | null,
  user?: User | null
): string {
  return profile?.name || user?.user_metadata?.name || user?.email || "User";
}
