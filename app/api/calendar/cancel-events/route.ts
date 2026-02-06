import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cancelCalendarEvents } from "@/lib/api/calendar-invites";

/**
 * POST /api/calendar/cancel-events
 *
 * Cancels Google Calendar events when a gig is deleted.
 * Call this BEFORE deleting the gig so we still have access to the gig_roles.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { gigId } = body as { gigId: string };

    if (!gigId) {
      return NextResponse.json(
        { error: "gigId is required" },
        { status: 400 }
      );
    }

    const cancelled = await cancelCalendarEvents(gigId, user.id);

    return NextResponse.json({ cancelled });

  } catch (error) {
    console.error("[Cancel Calendar Events] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to cancel events" },
      { status: 500 }
    );
  }
}
