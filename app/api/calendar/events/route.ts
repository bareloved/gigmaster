import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchGoogleCalendarEvents } from "@/lib/api/calendar-google";

/**
 * GET /api/calendar/events
 * Fetch events from user's Google Calendar
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    if (!fromParam || !toParam) {
      return NextResponse.json(
        { error: "Missing from/to parameters" },
        { status: 400 }
      );
    }

    const from = new Date(fromParam);
    const to = new Date(toParam);

    // Optional: specific calendar IDs (comma-separated)
    const calendarIdsParam = searchParams.get("calendarIds");
    const calendarIds = calendarIdsParam
      ? calendarIdsParam.split(",").filter(Boolean)
      : undefined;

    // Fetch events
    const events = await fetchGoogleCalendarEvents(user.id, from, to, calendarIds);

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch calendar events";
    const needsReconnect = message.includes("expired") || message.includes("reconnect");
    return NextResponse.json(
      { error: message, needsReconnect },
      { status: 500 }
    );
  }
}

