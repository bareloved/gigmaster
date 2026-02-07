"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Check if we're in a recovery session
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // If there's a session and the URL has a recovery token, we're in recovery mode
      if (session) {
        setIsRecoveryMode(true);
      }
      setCheckingSession(false);
    };

    // Listen for PASSWORD_RECOVERY event
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
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
        router.push("/gigs");
      }, 2000);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a2e]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" />
          <p className="mt-4 text-sm text-amber-200/60">
            Verifying your link...
          </p>
        </div>
      </div>
    );
  }

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
      <div className="flex items-center justify-center bg-[#1a1a2e] p-4 lg:p-8">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-[#2a2a3e] rounded-2xl p-8 shadow-2xl">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-6">
              <h2
                className="text-2xl font-bold text-amber-50"
                style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}
              >
                Gigmaster
              </h2>
            </div>

            {!isRecoveryMode ? (
              // Invalid or expired link
              <div className="space-y-6 text-center">
                <div className="rounded-2xl bg-red-900/30 border border-red-700/50 p-6">
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-red-300 mb-2">
                    Invalid or expired link
                  </p>
                  <p className="text-sm text-red-400/80">
                    This password reset link is no longer valid. Please request
                    a new one.
                  </p>
                </div>
                <Link href="/auth/forgot-password">
                  <Button className="w-full h-14 rounded-full font-medium bg-amber-600 hover:bg-amber-500 text-white">
                    Request new link
                  </Button>
                </Link>
              </div>
            ) : success ? (
              // Success state
              <div className="space-y-6 text-center">
                <div className="rounded-2xl bg-green-900/30 border border-green-700/50 p-6">
                  <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-green-300 mb-2">
                    Password updated!
                  </p>
                  <p className="text-sm text-green-400/80">
                    Redirecting you to the dashboard...
                  </p>
                </div>
              </div>
            ) : (
              // Password reset form
              <>
                {/* Header */}
                <h1
                  className="text-2xl font-bold text-center text-amber-50 mb-3"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  Set new password
                </h1>
                <p className="text-center text-amber-200/60 text-sm mb-8">
                  Enter your new password below
                </p>

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  {/* Error */}
                  {error && (
                    <div className="rounded-lg bg-red-900/30 border border-red-700/50 p-3 text-sm text-red-300 text-center">
                      {error}
                    </div>
                  )}

                  {/* Password Input */}
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="New password *"
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

                  {/* Confirm Password Input */}
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      name="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password *"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                      minLength={6}
                      className="h-14 rounded-2xl bg-[#3a3a4e] border-0 text-amber-50 placeholder:text-amber-200/40 focus:ring-2 focus:ring-amber-500/50 px-5 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-200/50 hover:text-amber-200 transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full h-14 rounded-full font-medium bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50 disabled:bg-[#3a3a4e] disabled:text-amber-200/40 mt-2"
                    disabled={loading || !password || !confirmPassword}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Password"
                    )}
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
