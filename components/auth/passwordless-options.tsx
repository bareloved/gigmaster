"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { Loader2, Mail, KeyRound } from "lucide-react";

interface PasswordlessOptionsProps {
  email: string;
  redirectTo?: string;
}

type Mode = "idle" | "magic-link-sent" | "otp-sent" | "verifying";

export function PasswordlessOptions({
  email,
  redirectTo = "/gigs",
}: PasswordlessOptionsProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("idle");
  const [otpValue, setOtpValue] = useState("");
  const [loading, setLoading] = useState<"magic" | "otp" | "verify" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const handleMagicLink = async () => {
    if (!email) {
      setError("Please enter your email address first");
      return;
    }

    setLoading("magic");
    setError(null);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: false,
      },
    });

    if (error) {
      if (error.message.includes("Signups not allowed")) {
        setError("No account found with this email. Please sign up first.");
      } else {
        setError(error.message);
      }
      setLoading(null);
    } else {
      setMode("magic-link-sent");
      setLoading(null);
    }
  };

  const handleSendOtp = async () => {
    if (!email) {
      setError("Please enter your email address first");
      return;
    }

    setLoading("otp");
    setError(null);

    const supabase = createClient();

    // For OTP, we don't include emailRedirectTo - this sends a code instead of a link
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    });

    if (error) {
      if (error.message.includes("Signups not allowed")) {
        setError("No account found with this email. Please sign up first.");
      } else {
        setError(error.message);
      }
      setLoading(null);
    } else {
      setMode("otp-sent");
      setOtpValue("");
      setLoading(null);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    if (code.length !== 6) return;

    setLoading("verify");
    setError(null);

    const supabase = createClient();

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (error) {
      setError("Invalid or expired code. Please try again.");
      setOtpValue("");
      setLoading(null);
    } else {
      // Success - redirect to dashboard
      router.push(redirectTo);
      router.refresh();
    }
  };

  const handleOtpChange = (value: string) => {
    setOtpValue(value);
    setError(null);
    // Auto-submit when all 6 digits are entered
    if (value.length === 6) {
      handleVerifyOtp(value);
    }
  };

  const handleResendCode = () => {
    setMode("idle");
    setOtpValue("");
    setError(null);
  };

  // Magic link sent success state
  if (mode === "magic-link-sent") {
    return (
      <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4 text-center">
        <Mail className="w-5 h-5 mx-auto mb-2 text-green-600 dark:text-green-400" />
        <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">
          Check your email
        </p>
        <p className="text-xs text-green-600 dark:text-green-400">
          We sent a sign-in link to {email}
        </p>
      </div>
    );
  }

  // OTP input state
  if (mode === "otp-sent") {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <KeyRound className="w-5 h-5 mx-auto mb-2 text-stone-600 dark:text-stone-400" />
          <p className="text-sm font-medium text-stone-800 dark:text-stone-200 mb-1">
            Enter your code
          </p>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            We sent a 6-digit code to {email}
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-3 text-sm text-red-700 dark:text-red-400 text-center">
            {error}
          </div>
        )}

        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={otpValue}
            onChange={handleOtpChange}
            disabled={loading === "verify"}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        {loading === "verify" && (
          <div className="flex items-center justify-center gap-2 text-sm text-stone-600 dark:text-stone-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verifying...
          </div>
        )}

        <div className="flex justify-center gap-4 text-xs">
          <button
            type="button"
            onClick={handleResendCode}
            className="text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 underline"
            disabled={loading === "verify"}
          >
            Try a different method
          </button>
          <button
            type="button"
            onClick={handleSendOtp}
            className="text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 underline"
            disabled={loading === "verify"}
          >
            Resend code
          </button>
        </div>
      </div>
    );
  }

  // Default idle state - show both options
  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-3 text-sm text-red-700 dark:text-red-400 text-center">
          {error}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full h-12 font-medium border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-stone-50 dark:hover:bg-zinc-800"
        onClick={handleMagicLink}
        disabled={loading !== null || !email}
      >
        {loading === "magic" ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending link...
          </>
        ) : (
          <>
            <Mail className="mr-2 h-4 w-4" />
            Send me a sign-in link
          </>
        )}
      </Button>

      <Button
        type="button"
        variant="outline"
        className="w-full h-12 font-medium border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-stone-50 dark:hover:bg-zinc-800"
        onClick={handleSendOtp}
        disabled={loading !== null || !email}
      >
        {loading === "otp" ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending code...
          </>
        ) : (
          <>
            <KeyRound className="mr-2 h-4 w-4" />
            Send me a code
          </>
        )}
      </Button>

      {!email && (
        <p className="text-xs text-stone-600/60 dark:text-stone-400/40 text-center">
          Enter your email above to use passwordless sign-in
        </p>
      )}
    </div>
  );
}
