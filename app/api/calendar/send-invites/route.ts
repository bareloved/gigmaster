import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendCalendarInvites, getRolesNeedingInvites } from "@/lib/api/calendar-invites";

/**
 * POST /api/calendar/send-invites
 *
 * Sends Google Calendar invitations to lineup members
 * Falls back to email if calendar fails
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
    const { gigId, roleEmails } = body as {
      gigId: string;
      roleEmails?: Record<string, string>;
    };

    if (!gigId) {
      return NextResponse.json(
        { error: "gigId is required" },
        { status: 400 }
      );
    }

    console.log("[Send Invites API] Processing for gig:", gigId, "roleEmails:", roleEmails);
    const result = await sendCalendarInvites(gigId, user.id, roleEmails);
    console.log("[Send Invites API] Result:", result);

    return NextResponse.json(result);

  } catch (error) {
    console.error("[Send Invites] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send invites" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/calendar/send-invites?gigId=xxx
 *
 * Get roles that need invitations (for showing email collection modal)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const gigId = searchParams.get("gigId");

    if (!gigId) {
      return NextResponse.json(
        { error: "gigId is required" },
        { status: 400 }
      );
    }

    const { roles, missingEmails } = await getRolesNeedingInvites(gigId);

    return NextResponse.json({
      needsInvites: roles.length + missingEmails.length,
      withEmails: roles.length,
      missingEmails: missingEmails.map(r => ({
        id: r.id,
        name: r.musician_name || 'Unknown',
        role: r.role_name,
      })),
    });

  } catch (error) {
    console.error("[Get Roles] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get roles" },
      { status: 500 }
    );
  }
}
