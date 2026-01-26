"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

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
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                Reset your password
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter your email address and we&apos;ll send you a link to reset your password
              </p>
            </div>

            {success ? (
              <div className="space-y-4">
                <div className="rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 text-center">
                  <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">
                    Check your email
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    We&apos;ve sent a password reset link to {email}
                  </p>
                </div>
                <div className="text-center">
                  <Link
                    href="/auth/sign-in"
                    className="text-sm text-primary hover:underline"
                  >
                    Back to sign in
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {error && (
                  <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive text-center">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11"
                  />
                </div>

                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>

                <div className="text-center">
                  <Link
                    href="/auth/sign-in"
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    Back to sign in
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
