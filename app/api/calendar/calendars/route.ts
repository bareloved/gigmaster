import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  fetchUserCalendarList,
  saveSelectedCalendars,
} from "@/lib/api/calendar-google";

/**
 * GET /api/calendar/calendars
 * Returns user's Google Calendar list + saved selections
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await fetchUserCalendarList(user.id);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch calendars";

    // Token was revoked — connection already cleaned up, tell client to reconnect
    if (message === "token_revoked") {
      return NextResponse.json(
        { error: "Calendar disconnected. Please reconnect your Google account." },
        { status: 401 }
      );
    }

    console.error("Error fetching calendar list:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/calendar/calendars
 * Save selected calendars
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { calendars } = body;

    if (!Array.isArray(calendars)) {
      return NextResponse.json(
        { error: "Missing calendars array" },
        { status: 400 }
      );
    }

    await saveSelectedCalendars(user.id, calendars);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error saving selected calendars:", error);
    return NextResponse.json(
      { error: "Failed to save selections" },
      { status: 500 }
    );
  }
}
