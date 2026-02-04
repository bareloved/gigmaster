import { NextRequest, NextResponse } from "next/server";
import { GoogleCalendarClient } from "@/lib/integrations/google-calendar";

/**
 * GET /api/calendar/connect?writeAccess=true
 *
 * Initiates Google Calendar OAuth flow
 * Pass writeAccess=true to request write permissions for calendar invites
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const writeAccess = searchParams.get("writeAccess") === "true";

    const googleClient = new GoogleCalendarClient();
    const authUrl = googleClient.getAuthorizationUrl(writeAccess);

    return NextResponse.json({ url: authUrl });
  } catch (error: unknown) {
    console.error("[Calendar Connect] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate auth URL" },
      { status: 500 }
    );
  }
}

