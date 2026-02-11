import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { importCalendarEventAsGig } from "@/lib/api/calendar-google";
import type { GoogleCalendarEvent } from "@/lib/integrations/google-calendar";

/**
 * POST /api/calendar/import-batch
 * Batch import multiple calendar events as gigs
 *
 * Body: { events: GoogleCalendarEvent[] }
 * Returns: { results: { eventId, gigId, duplicate }[] }
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
    const { events } = body as { events: GoogleCalendarEvent[] };

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: "Missing events array" },
        { status: 400 }
      );
    }

    // Fetch all already-imported event IDs in one query
    const eventIds = events.map((e) => e.id);
    const { data: existingGigs } = await supabase
      .from("gigs")
      .select("id, external_calendar_event_id")
      .in("external_calendar_event_id", eventIds)
      .eq("owner_id", user.id)
      .is("deleted_at", null);

    const existingMap = new Map(
      (existingGigs || []).map((g) => [g.external_calendar_event_id, g.id])
    );

    // Import each event sequentially to avoid race conditions
    const results: { eventId: string; gigId: string; duplicate: boolean }[] = [];

    for (const event of events) {
      try {
        const wasDuplicate = existingMap.has(event.id);
        const gigId = await importCalendarEventAsGig(user.id, event);
        results.push({
          eventId: event.id,
          gigId,
          duplicate: wasDuplicate,
        });
      } catch (err) {
        console.error(`Failed to import event ${event.id}:`, err);
        // Continue with remaining events
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error in batch import:", error);
    return NextResponse.json(
      { error: "Failed to import events" },
      { status: 500 }
    );
  }
}
