import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateCalendarEvents } from "@/lib/api/calendar-invites";

/**
 * POST /api/calendar/update-events
 *
 * Updates Google Calendar events when gig details change.
 * Call this after saving a gig to sync changes to calendar invites.
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
    const { gigId, changedFields } = body as {
      gigId: string;
      changedFields: string[];
    };

    if (!gigId) {
      return NextResponse.json(
        { error: "gigId is required" },
        { status: 400 }
      );
    }

    if (!changedFields || changedFields.length === 0) {
      return NextResponse.json({ updated: 0 });
    }

    const updated = await updateCalendarEvents(gigId, user.id, changedFields);

    return NextResponse.json({ updated });

  } catch (error) {
    console.error("[Update Calendar Events] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update events" },
      { status: 500 }
    );
  }
}
