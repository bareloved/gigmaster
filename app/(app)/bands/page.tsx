import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BandsClientPage from "./client-page";
import { Band } from "@/lib/types/gigpack";

export const dynamic = "force-dynamic";

interface BandsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function BandsPage({
  params,
}: BandsPageProps) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      redirect(`/auth/sign-in`);
    }

    // Fetch user's bands
    const { data: bands, error } = await supabase
      .from("bands")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching bands:", error);
      return (
        <div className="py-12 px-8 flex flex-col items-center justify-center text-center space-y-4">
          <div className="text-destructive font-semibold">Failed to load bands</div>
          <p className="text-muted-foreground max-w-md">
            We couldn't reach the database. This might be a temporary connection issue.
          </p>
        </div>
      );
    }

    // Map database fields to Band interface
    const mappedBands: Band[] = (bands || []).map((b: any) => ({
      ...b,
      hero_image_url: b.hero_image_url || b.cover_image_url || null,
      accent_color: b.accent_color || null,
      poster_skin: b.poster_skin || "clean", // Default to clean if missing
      default_lineup: b.default_lineup || [],
    }));

    return <BandsClientPage initialBands={mappedBands} />;
  } catch (err) {
    console.error("Unexpected error in BandsPage:", err);
    return (
      <div className="py-12 px-8 flex flex-col items-center justify-center text-center space-y-4">
        <div className="text-destructive font-semibold">Connection Timeout</div>
        <p className="text-muted-foreground max-w-md">
          The server took too long to respond. Please check your internet connection and try refreshing the page.
        </p>
      </div>
    );
  }
}
