import { NextResponse } from "next/server";
import { GoogleCalendarClient } from "@/lib/integrations/google-calendar";

/**
 * Initiate Google Calendar OAuth Flow
 * 
 * Returns the authorization URL for user to connect their Google Calendar
 */

export async function GET() {
  try {
    const googleClient = new GoogleCalendarClient();
    const authUrl = googleClient.getAuthorizationUrl();

    return NextResponse.json({ url: authUrl });
  } catch (error: unknown) {
    console.error("Failed to generate auth URL:", error);
    return NextResponse.json(
      { error: "Failed to initiate connection" },
      { status: 500 }
    );
  }
}

