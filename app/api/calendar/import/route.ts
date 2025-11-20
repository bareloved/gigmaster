import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { importCalendarEventAsGig } from "@/lib/api/calendar-google";

/**
 * POST /api/calendar/import
 * Import a calendar event as a gig
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, event } = body;

    if (!projectId || !event) {
      return NextResponse.json(
        { error: "Missing projectId or event" },
        { status: 400 }
      );
    }

    // Import event
    const gigId = await importCalendarEventAsGig(user.id, projectId, event);

    return NextResponse.json({ gigId });
  } catch (error) {
    console.error("Error importing calendar event:", error);
    return NextResponse.json(
      { error: "Failed to import event" },
      { status: 500 }
    );
  }
}

