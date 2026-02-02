import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { importCalendarEventAsGig } from "@/lib/api/calendar-google";

/**
 * POST /api/calendar/import
 * Import a calendar event as an external gig
 *
 * Returns { gigId, isExternal: true }
 * If the event was already imported, returns { gigId, isExternal: true, duplicate: true }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { event } = body;

    if (!event) {
      return NextResponse.json(
        { error: "Missing event" },
        { status: 400 }
      );
    }

    // Check for existing import before calling importCalendarEventAsGig
    // (the function handles duplicates, but we want to detect it for the response)
    const { data: existingGig } = await supabase
      .from("gigs")
      .select("id")
      .eq("external_calendar_event_id", event.id)
      .eq("owner_id", user.id)
      .maybeSingle();

    const gigId = await importCalendarEventAsGig(user.id, event);

    return NextResponse.json({
      gigId,
      isExternal: true,
      duplicate: !!existingGig,
    });
  } catch (error) {
    console.error("Error importing calendar event:", error);
    return NextResponse.json(
      { error: "Failed to import event" },
      { status: 500 }
    );
  }
}

