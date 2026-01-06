"use client";

import { useUser } from "@/lib/providers/user-provider";
import { AppLoadingScreen } from "./app-loading-screen";

interface AuthLoadingGateProps {
  children: React.ReactNode;
}

/**
 * Shows a loading screen while auth state is being determined.
 * Once auth resolves (user loaded or confirmed unauthenticated),
 * renders children.
 */
export function AuthLoadingGate({ children }: AuthLoadingGateProps) {
  const { isLoading } = useUser();

  if (isLoading) {
    return <AppLoadingScreen />;
  }

  return <>{children}</>;
}
