import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Disconnect Google Calendar
 * 
 * Removes the calendar connection and all stored tokens
 */

export async function POST() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    // Delete calendar connection (cascade deletes sync log entries)
    const { error: deleteError } = await supabase
      .from("calendar_connections")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", "google");

    if (deleteError) {
      console.error("Failed to disconnect calendar:", deleteError);
      return NextResponse.json(
        { error: "Failed to disconnect" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Disconnect error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

