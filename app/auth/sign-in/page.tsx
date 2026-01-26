"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { PasswordlessOptions } from "@/components/auth/passwordless-options";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      const redirectTo = searchParams.get("redirectTo") || "/dashboard";
      router.push(redirectTo);
      router.refresh();
    }
  };

  const handleGoogleSignIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Side - Vintage Poster */}
      <div className="hidden lg:flex flex-col relative overflow-hidden bg-[#1a1a2e]">
        {/* Noise texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.15] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/20 rounded-full blur-[120px]" />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-10 text-cream">
          {/* Top decorative line */}
          <div className="flex items-center gap-4 text-amber-400/60">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
            <span className="text-xs tracking-[0.3em] uppercase">Est. 2024</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
          </div>

          {/* Main poster content */}
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
            {/* Stars decoration */}
            <div className="flex items-center gap-3 mb-6">
              <Star className="w-4 h-4 text-amber-400" />
              <Star className="w-3 h-3 text-amber-400/60" />
              <Star className="w-4 h-4 text-amber-400" />
            </div>

            {/* Main headline */}
            <h1 className="font-bold tracking-tight text-amber-50 leading-none">
              <span className="block text-lg tracking-[0.2em] uppercase text-amber-400 mb-2">
                Welcome to
              </span>
              <span
                className="block text-7xl"
                style={{
                  fontFamily: "Georgia, serif",
                  fontStyle: "italic",
                }}
              >
                Gigmaster
              </span>
            </h1>

            {/* Tagline with decorative elements */}
            <div className="mt-8 mb-10 flex items-center gap-4">
              <div className="w-12 h-px bg-amber-400/40" />
              <p
                className="text-amber-200/80 text-sm tracking-[0.15em] uppercase"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Your Gig Brain
              </p>
              <div className="w-12 h-px bg-amber-400/40" />
            </div>

            {/* Feature list - vintage style */}
            <div className="space-y-3 mb-10">
              {[
                "Manage Your Gigs",
                "Coordinate Your Band",
                "Track Your Earnings",
                "Never Miss a Show",
              ].map((feature, i) => (
                <div key={i} className="flex items-center justify-center gap-3">
                  <Diamond className="w-2 h-2 text-amber-400/60" />
                  <span
                    className="text-amber-100/70 text-sm tracking-wide"
                    style={{ fontFamily: "Georgia, serif" }}
                  >
                    {feature}
                  </span>
                  <Diamond className="w-2 h-2 text-amber-400/60" />
                </div>
              ))}
            </div>

            {/* Decorative border box */}
            <div className="relative px-8 py-4 border border-amber-400/30 rounded-sm">
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-3 bg-[#1a1a2e]">
                <Star className="w-4 h-4 text-amber-400" />
              </div>
              <p
                className="text-amber-200/60 text-xs tracking-[0.2em] uppercase"
                style={{ fontFamily: "Georgia, serif" }}
              >
                For Musicians, By Musicians
              </p>
            </div>
          </div>

          {/* Bottom decoration */}
          <div className="flex items-center gap-4 text-amber-400/60">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
            <div className="flex items-center gap-2">
              <Diamond className="w-2 h-2" />
              <span className="text-xs tracking-[0.2em] uppercase">
                The Show Must Go On
              </span>
              <Diamond className="w-2 h-2" />
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex flex-col bg-[#f5f0e6] dark:bg-zinc-950">
        {/* Header */}
        <header className="flex h-16 items-center justify-between px-6 border-b border-amber-700/30 dark:border-zinc-800">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-lg lg:hidden"
          >
            <span
              className="text-2xl text-amber-900 dark:text-amber-100"
              style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}
            >
              Gigmaster
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-amber-800 dark:text-amber-200/60 hidden sm:inline">
              New here?
            </span>
            <Link href="/auth/sign-up">
              <Button
                variant="outline"
                size="sm"
                className="border-amber-700/40 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-900"
              >
                Sign up
              </Button>
            </Link>
          </div>
        </header>

        {/* Form Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm">
            {/* Form header with vintage styling */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-8 h-px bg-amber-700/40 dark:bg-amber-700" />
                <Star className="w-4 h-4 text-amber-700" />
                <div className="w-8 h-px bg-amber-700/40 dark:bg-amber-700" />
              </div>
              <h1
                className="text-3xl font-bold text-amber-950 dark:text-amber-100 mb-2"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Welcome Back
              </h1>
              <p className="text-amber-800 dark:text-amber-300/60 text-sm">
                Sign in to continue to your dashboard
              </p>
            </div>

            {/* Social Login */}
            <div className="space-y-3 mb-6">
              <Button
                variant="outline"
                className="w-full h-12 font-medium border-amber-700/30 dark:border-zinc-700 bg-[#faf8f3] dark:bg-zinc-900 hover:bg-amber-100/50 dark:hover:bg-zinc-800 text-amber-950"
                onClick={handleGoogleSignIn}
                type="button"
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-amber-700/30 dark:border-zinc-700" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#f5f0e6] dark:bg-zinc-950 px-3 text-xs text-amber-700 dark:text-amber-400/60 uppercase tracking-wider">
                  or with email
                </span>
              </div>
            </div>

            <form onSubmit={handleSignIn} className="space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-3 text-sm text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-amber-900 dark:text-amber-200"
                >
                  Email
                </Label>
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
                  className="h-12 bg-[#faf8f3] dark:bg-zinc-900 border-amber-700/30 dark:border-zinc-700 focus:border-amber-700 dark:focus:border-amber-600 text-amber-950 placeholder:text-amber-600/50"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="password"
                    className="text-amber-900 dark:text-amber-200"
                  >
                    Password
                  </Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 pr-10 bg-[#faf8f3] dark:bg-zinc-900 border-amber-700/30 dark:border-zinc-700 focus:border-amber-700 dark:focus:border-amber-600 text-amber-950 placeholder:text-amber-600/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 font-medium bg-amber-900 hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-amber-50"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            {/* Passwordless sign-in section */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-amber-700/30 dark:border-zinc-700" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#f5f0e6] dark:bg-zinc-950 px-3 text-xs text-amber-700 dark:text-amber-400/60 uppercase tracking-wider">
                  or without password
                </span>
              </div>
            </div>

            <PasswordlessOptions email={email} />

            <p className="text-center text-xs text-amber-700/70 dark:text-amber-400/50 mt-6">
              By continuing, you agree to our{" "}
              <Link
                href="/terms"
                className="underline hover:text-amber-900 dark:hover:text-amber-300"
              >
                Terms
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="underline hover:text-amber-900 dark:hover:text-amber-300"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple decorative components
function Star({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2L14.09 8.26L20.18 9.27L15.54 13.14L16.82 19.02L12 16.27L7.18 19.02L8.46 13.14L3.82 9.27L9.91 8.26L12 2Z" />
    </svg>
  );
}

function Diamond({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2L22 12L12 22L2 12L12 2Z" />
    </svg>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f5f0e6] dark:bg-zinc-950">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-700" />
            <p className="mt-4 text-sm text-amber-800 dark:text-amber-300">
              Loading...
            </p>
          </div>
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
