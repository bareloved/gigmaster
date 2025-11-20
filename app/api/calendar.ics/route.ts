import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createEvents, EventAttributes } from "ics";

/**
 * ICS Calendar Feed Endpoint
 * 
 * Public endpoint (no authentication required)
 * Uses token-based authentication via query parameter
 * 
 * Usage: /api/calendar.ics?token=USER_TOKEN
 */

export async function GET(request: NextRequest) {
  try {
    // Get token from query parameter
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return new NextResponse("Missing token parameter", {
        status: 400,
        headers: { "Content-Type": "text/plain" },
      });
    }

    // Validate token and get user ID (using server client)
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("calendar_ics_token", token)
      .single();

    if (error || !data) {
      return new NextResponse("Invalid token", {
        status: 401,
        headers: { "Content-Type": "text/plain" },
      });
    }

    const userId = data.id;

    // Fetch gigs for ICS feed
    const today = new Date();
    const past = new Date(today);
    past.setDate(past.getDate() - 30); // Include past 30 days
    const future = new Date(today);
    future.setFullYear(future.getFullYear() + 1); // Include next year

    const fromStr = past.toISOString().split('T')[0];
    const toStr = future.toISOString().split('T')[0];

    // Fetch gigs where user is manager (owner of project)
    const { data: managerGigs, error: managerError } = await supabase
      .from("gigs")
      .select(`
        id,
        project_id,
        title,
        date,
        start_time,
        end_time,
        location_name,
        status,
        projects!gigs_project_id_fkey(id, name, owner_id)
      `)
      .eq("projects.owner_id", userId)
      .gte("date", fromStr)
      .lte("date", toStr)
      .order("date", { ascending: true })
      .limit(500);

    if (managerError) {
      console.error("Error fetching manager gigs:", managerError);
      throw new Error(`Manager gigs error: ${managerError.message}`);
    }

    // Fetch gigs where user is player (has a gig_role)
    const { data: playerGigs, error: playerError } = await supabase
      .from("gig_roles")
      .select(`
        id,
        role_name,
        invitation_status,
        is_paid,
        gigs!gig_roles_gig_id_fkey(
          id,
          project_id,
          title,
          date,
          start_time,
          end_time,
          location_name,
          status,
          projects!gigs_project_id_fkey(id, name)
        )
      `)
      .eq("musician_id", userId)
      .gte("gigs.date", fromStr)
      .lte("gigs.date", toStr)
      .limit(500);

    if (playerError) {
      console.error("Error fetching player gigs:", playerError);
      throw new Error(`Player gigs error: ${playerError.message}`);
    }

    // Combine and deduplicate gigs
    const gigMap = new Map();

    // Add manager gigs
    (managerGigs || []).forEach((row: any) => {
      gigMap.set(row.id, {
        gigId: row.id,
        projectId: row.project_id,
        projectName: row.projects.name,
        gigTitle: row.title,
        date: row.date,
        startTime: row.start_time,
        endTime: row.end_time,
        locationName: row.location_name,
        status: row.status,
        isManager: true,
        isPlayer: false,
      });
    });

    // Add player gigs
    (playerGigs || []).forEach((row: any) => {
      const gig = row.gigs;
      const gigId = gig.id;
      
      if (gigMap.has(gigId)) {
        // Already have this gig as manager, mark as player too
        const existing = gigMap.get(gigId);
        existing.isPlayer = true;
        existing.playerRoleName = row.role_name;
      } else {
        // New gig where user is only player
        gigMap.set(gigId, {
          gigId: gig.id,
          projectId: gig.project_id,
          projectName: gig.projects.name,
          gigTitle: gig.title,
          date: gig.date,
          startTime: gig.start_time,
          endTime: gig.end_time,
          locationName: gig.location_name,
          status: gig.status,
          isManager: false,
          isPlayer: true,
          playerRoleName: row.role_name,
        });
      }
    });

    const gigs = Array.from(gigMap.values());

    // Convert gigs to ICS events
    const events: EventAttributes[] = gigs.map((gig) => {
      const gigDate = new Date(gig.date);
      const year = gigDate.getFullYear();
      const month = gigDate.getMonth() + 1;
      const day = gigDate.getDate();

      let startArray: [number, number, number, number, number];
      let endArray: [number, number, number, number, number];

      if (gig.startTime) {
        const [hours, minutes] = gig.startTime.split(":").map(Number);
        startArray = [year, month, day, hours, minutes];
      } else {
        startArray = [year, month, day, 0, 0];
      }

      if (gig.endTime) {
        const [hours, minutes] = gig.endTime.split(":").map(Number);
        endArray = [year, month, day, hours, minutes];
      } else if (gig.startTime) {
        const [hours, minutes] = gig.startTime.split(":").map(Number);
        endArray = [year, month, day, hours + 3, minutes];
      } else {
        endArray = [year, month, day, 23, 59];
      }

      const baseUrl = request.nextUrl.origin;
      const gigPackUrl = `${baseUrl}/gigs/${gig.gigId}/pack`;
      
      let description = `View details: ${gigPackUrl}`;
      if (gig.isPlayer && gig.playerRoleName) {
        description = `Your role: ${gig.playerRoleName}\n\n${description}`;
      }

      const title = `[${gig.projectName}] ${gig.gigTitle}`;

      return {
        start: startArray,
        end: endArray,
        title,
        description,
        location: gig.locationName || undefined,
        status: "CONFIRMED",
        busyStatus: "BUSY",
        uid: `ensemble-gig-${gig.gigId}@ensemble.app`,
      };
    });

    // Generate ICS file
    const { error: icsError, value: icsContent } = createEvents(events);

    if (icsError) {
      throw new Error("Failed to generate ICS feed");
    }

    // Add calendar name and description
    let finalContent = icsContent || "";
    
    // Split by lines and insert calendar metadata after BEGIN:VCALENDAR
    const lines = finalContent.split('\n');
    const calendarMetadata = [
      'X-WR-CALNAME:Ensemble Gigs',
      'X-WR-CALDESC:Your gigs from Ensemble',
      'X-WR-TIMEZONE:UTC'
    ];
    
    // Find BEGIN:VCALENDAR and insert metadata after it
    const beginIndex = lines.findIndex(line => line.trim() === 'BEGIN:VCALENDAR');
    if (beginIndex !== -1) {
      lines.splice(beginIndex + 1, 0, ...calendarMetadata);
      finalContent = lines.join('\n');
    }

    // Return ICS file
    return new NextResponse(finalContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="ensemble-gigs.ics"',
        "Cache-Control": "public, max-age=60", // Cache for 1 minute
      },
    });
  } catch (error) {
    console.error("Error generating ICS feed:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new NextResponse(`Internal server error: ${errorMessage}`, {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

