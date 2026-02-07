"use client";

import { useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [instrument, setInstrument] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          main_instrument: instrument,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user && !data.user.confirmed_at) {
      setSuccess(true);
      setLoading(false);
      setName("");
      setInstrument("");
      setEmail("");
      setPassword("");
      return;
    }

    if (data.user && data.user.confirmed_at) {
      const redirectTo = searchParams.get("redirectTo") || "/gigs";
      router.push(redirectTo);
      router.refresh();
    }
  };

  const handleGoogleSignUp = async () => {
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
            <span className="text-xs tracking-[0.3em] uppercase">
              Est. 2024
            </span>
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
              <span className="block text-lg tracking-[0.2em] uppercase text-amber-400 mb-4">
                Join the
              </span>
              <Image src="/gigmasterlogo.png" alt="GigMaster" width={560} height={440} className="mx-auto w-auto" priority />
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
                "Free Forever for Musicians",
                "No Credit Card Required",
                "Set Up in 2 Minutes",
                "Join 1,000+ Gigging Pros",
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
      <div className="flex items-center justify-center bg-[#1a1a2e] p-4 lg:p-8">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-[#2a2a3e] rounded-2xl p-8 shadow-2xl">
            {/* Mobile Logo */}
            <div className="lg:hidden flex justify-center mb-6">
              <Image src="/gigmasterlogo.png" alt="GigMaster" width={320} height={252} className="w-auto" priority />
            </div>

            {/* Header */}
            <h1
              className="text-3xl font-bold text-center text-amber-50 mb-3"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Sign Up
            </h1>
            <p className="text-center text-amber-200/60 text-sm mb-8">
              By continuing, you agree to our{" "}
              <Link href="/terms" className="text-amber-400 hover:underline">
                User Agreement
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-amber-400 hover:underline">
                Privacy Policy
              </Link>
              .
            </p>

            {/* Success Message */}
            {success && (
              <div className="mb-6 rounded-lg bg-green-900/30 border border-green-700/50 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-300">
                      Account created!
                    </p>
                    <p className="text-xs text-green-400/80 mt-1">
                      Check your email to confirm your account.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Social Buttons */}
            <div className="space-y-3 mb-6">
              <Button
                variant="outline"
                className="w-full h-12 rounded-full font-medium bg-[#f5f0e6] border-0 hover:bg-[#ebe4d4] text-amber-950 hover:text-amber-950"
                onClick={handleGoogleSignUp}
                type="button"
              >
                <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
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

              <Button
                variant="outline"
                className="w-full h-12 rounded-full font-medium bg-[#f5f0e6] border-0 hover:bg-[#ebe4d4] text-amber-950 hover:text-amber-950"
                disabled
                type="button"
              >
                <svg
                  className="mr-3 h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                Continue with Apple
              </Button>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-amber-200/20" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#2a2a3e] px-4 text-sm text-amber-200/50 uppercase tracking-wider">
                  Or
                </span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 rounded-lg bg-red-900/30 border border-red-700/50 p-3 text-sm text-red-300 text-center">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Name *"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                  className="h-14 rounded-2xl bg-[#3a3a4e] border-0 text-amber-50 placeholder:text-amber-200/40 focus:ring-2 focus:ring-amber-500/50 px-5"
                />

                <Input
                  id="instrument"
                  name="instrument"
                  type="text"
                  placeholder="Instrument"
                  autoComplete="off"
                  value={instrument}
                  onChange={(e) => setInstrument(e.target.value)}
                  disabled={loading}
                  className="h-14 rounded-2xl bg-[#3a3a4e] border-0 text-amber-50 placeholder:text-amber-200/40 focus:ring-2 focus:ring-amber-500/50 px-5"
                />
              </div>

              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Email *"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-14 rounded-2xl bg-[#3a3a4e] border-0 text-amber-50 placeholder:text-amber-200/40 focus:ring-2 focus:ring-amber-500/50 px-5"
              />

              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password * (min 6 characters)"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                  className="h-14 rounded-2xl bg-[#3a3a4e] border-0 text-amber-50 placeholder:text-amber-200/40 focus:ring-2 focus:ring-amber-500/50 px-5 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-200/50 hover:text-amber-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Links */}
              <div className="pt-2">
                <p className="text-sm text-amber-200/60">
                  Already have an account?{" "}
                  <Link
                    href="/auth/sign-in"
                    className="text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    Log In
                  </Link>
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-14 rounded-full font-medium bg-amber-600 hover:bg-amber-500 text-white mt-4 disabled:opacity-50 disabled:bg-amber-800"
                disabled={loading || !email || !password || !name}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Sign Up"
                )}
              </Button>
            </form>
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

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#1a1a2e]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" />
            <p className="mt-4 text-sm text-amber-200/60">Loading...</p>
          </div>
        </div>
      }
    >
      <SignUpForm />
    </Suspense>
  );
}
