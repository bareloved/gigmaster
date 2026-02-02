import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { refreshExternalGig } from "@/lib/api/calendar-google";

/**
 * POST /api/calendar/refresh
 * Refresh an external gig from Google Calendar
 * Body: { gigId: string, confirm?: boolean }
 * Returns: CalendarRefreshDiff
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { gigId, confirm } = body;

    if (!gigId) {
      return NextResponse.json(
        { error: "Missing gigId" },
        { status: 400 }
      );
    }

    const diff = await refreshExternalGig(gigId, user.id, confirm === true);

    return NextResponse.json(diff);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to refresh";
    console.error("Error refreshing external gig:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
