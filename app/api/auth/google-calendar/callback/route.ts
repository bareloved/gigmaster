import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleCalendarClient } from "@/lib/integrations/google-calendar";

/**
 * Google Calendar OAuth Callback
 * 
 * Handles the OAuth redirect from Google after user authorizes the app.
 * Exchanges authorization code for tokens and stores in database.
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    // Check for OAuth errors
    if (error) {
      console.error("Google OAuth error:", error);
      return NextResponse.redirect(
        new URL(`/settings/calendar?error=oauth_${error}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/settings/calendar?error=missing_code", request.url)
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(
        new URL("/auth/sign-in?error=unauthenticated", request.url)
      );
    }

    // Exchange authorization code for tokens
    const googleClient = new GoogleCalendarClient();
    if (process.env.NODE_ENV === 'development') {
      console.log("[OAuth Callback] Exchanging code for tokens...");
    }
    const tokens = await googleClient.authorize(code);
    if (process.env.NODE_ENV === 'development') {
      console.log("[OAuth Callback] Tokens received:", {
        has_access: !!tokens.access_token,
        has_refresh: !!tokens.refresh_token,
        expiry: new Date(tokens.expiry_date).toISOString(),
      });
    }

    // Store tokens in database
    if (process.env.NODE_ENV === 'development') {
      console.log("[OAuth Callback] Saving to database for user:", user.id);
    }
    const { data: savedConnection, error: dbError } = await supabase
      .from("calendar_connections")
      .upsert(
        {
          user_id: user.id,
          provider: "google",
          provider_calendar_id: "primary",
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: new Date(tokens.expiry_date).toISOString(),
          sync_enabled: true,
          last_synced_at: null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,provider",
        }
      )
      .select();

    if (dbError) {
      console.error("[OAuth Callback] Failed to save calendar connection:", dbError);
      return NextResponse.redirect(
        new URL("/settings/calendar?error=save_failed", request.url)
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log("[OAuth Callback] Successfully saved connection:", savedConnection);
    }

    // Success! Redirect back to settings
    return NextResponse.redirect(
      new URL("/settings/calendar?success=connected", request.url)
    );
  } catch (error: any) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      new URL(`/settings/calendar?error=callback_failed`, request.url)
    );
  }
}

