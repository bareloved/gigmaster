"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, ArrowLeft } from "lucide-react";

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
                For Gigging Musicians
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
      <div className="flex items-center justify-center bg-[#1a1a2e] p-4 lg:p-8">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-[#2a2a3e] rounded-2xl p-8 shadow-2xl">
            {/* Back Button */}
            <Link href="/auth/sign-in">
              <button className="mb-6 w-10 h-10 rounded-full bg-[#3a3a4e] flex items-center justify-center text-amber-200/60 hover:text-amber-200 hover:bg-[#4a4a5e] transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>

            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-6">
              <h2
                className="text-2xl font-bold text-amber-50"
                style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}
              >
                Gigmaster
              </h2>
            </div>

            {/* Header */}
            <h1
              className="text-2xl font-bold text-center text-amber-50 mb-3"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Reset your password
            </h1>
            <p className="text-center text-amber-200/60 text-sm mb-8">
              Enter your email and we&apos;ll send you a link to reset your password
            </p>

            {success ? (
              <div className="space-y-6">
                <div className="rounded-2xl bg-green-900/30 border border-green-700/50 p-6 text-center">
                  <Mail className="w-12 h-12 text-green-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-green-300 mb-2">
                    Check your email!
                  </p>
                  <p className="text-sm text-green-400/80">
                    We sent a password reset link to{" "}
                    <span className="font-medium text-green-300">{email}</span>
                  </p>
                </div>
                <Link href="/auth/sign-in">
                  <Button
                    variant="outline"
                    className="w-full h-14 rounded-full font-medium bg-[#3a3a4e] border-0 hover:bg-[#4a4a5e] text-amber-200 hover:text-amber-100"
                  >
                    Back to login
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-6">
                {/* Error */}
                {error && (
                  <div className="rounded-lg bg-red-900/30 border border-red-700/50 p-3 text-sm text-red-300 text-center">
                    {error}
                  </div>
                )}

                {/* Email Input */}
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
                  autoFocus
                />

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full h-14 rounded-full font-medium bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50 disabled:bg-[#3a3a4e] disabled:text-amber-200/40"
                  disabled={loading || !email}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>

                {/* Back to sign in link */}
                <p className="text-center text-sm text-amber-200/60">
                  Remember your password?{" "}
                  <Link
                    href="/auth/sign-in"
                    className="text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    Sign in
                  </Link>
                </p>
              </form>
            )}
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
