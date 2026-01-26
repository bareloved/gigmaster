"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Check if we're in a recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      // If there's a session and the URL has a recovery token, we're in recovery mode
      if (session) {
        setIsRecoveryMode(true);
      }
      setCheckingSession(false);
    };

    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveryMode(true);
        setCheckingSession(false);
      }
    });

    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Verifying your link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex flex-col bg-muted p-10">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary p-2">
              <span className="text-2xl">🎵</span>
            </div>
            <span className="text-xl font-semibold">Ensemble</span>
          </div>
          <p className="text-sm text-muted-foreground ml-12">
            Your all-in-one gig management platform
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex flex-col">
        {/* Header */}
        <header>
          <div className="flex h-16 items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold text-lg lg:hidden">
              <span className="text-xl">🎵</span>
              Ensemble
            </Link>
            <div className="ml-auto">
              <Link href="/auth/sign-in">
                <Button variant="ghost">Sign in</Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Form Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-6">
            {!isRecoveryMode ? (
              // Invalid or expired link
              <div className="space-y-4 text-center">
                <div className="rounded-md bg-destructive/15 p-4">
                  <p className="text-sm font-medium text-destructive mb-1">
                    Invalid or expired link
                  </p>
                  <p className="text-xs text-destructive/80">
                    This password reset link is no longer valid. Please request a new one.
                  </p>
                </div>
                <Link href="/auth/forgot-password">
                  <Button variant="outline" className="w-full h-11">
                    Request new link
                  </Button>
                </Link>
              </div>
            ) : success ? (
              // Success state
              <div className="space-y-4 text-center">
                <div className="rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4">
                  <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">
                    Password updated successfully
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Redirecting you to the dashboard...
                  </p>
                </div>
              </div>
            ) : (
              // Password reset form
              <>
                <div className="space-y-2 text-center">
                  <h1 className="text-2xl font-semibold tracking-tight">
                    Set new password
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Enter your new password below
                  </p>
                </div>

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  {error && (
                    <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive text-center">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="New password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      minLength={6}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Input
                      id="confirm-password"
                      name="confirm-password"
                      type="password"
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                      minLength={6}
                      className="h-11"
                    />
                  </div>

                  <Button type="submit" className="w-full h-11" disabled={loading}>
                    {loading ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
