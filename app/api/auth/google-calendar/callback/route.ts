import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleCalendarClient } from "@/lib/integrations/google-calendar";

/**
 * Google Calendar OAuth Callback
 *
 * Handles the OAuth redirect from Google after user authorizes the app.
 * Detects if write access was granted and stores appropriately.
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const scope = searchParams.get("scope");

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
    const tokens = await googleClient.authorize(code);

    // Check if write scope was granted
    const grantedScopes = scope?.split(" ") || [];
    const hasWriteAccess = grantedScopes.includes(
      "https://www.googleapis.com/auth/calendar.events"
    );

    // Store tokens in database
    const { error: dbError } = await supabase
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
          write_access: hasWriteAccess,
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

    // Success! Redirect back to settings
    const successParam = hasWriteAccess ? "connected_write" : "connected";
    return NextResponse.redirect(
      new URL(`/settings/calendar?success=${successParam}`, request.url)
    );
  } catch (error: unknown) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      new URL(`/settings/calendar?error=callback_failed`, request.url)
    );
  }
}

