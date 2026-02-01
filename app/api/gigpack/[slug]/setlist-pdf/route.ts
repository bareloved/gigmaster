import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = createAdminClient();

  // Validate share token (same logic as getPublicGigPackDTO)
  const { data: share, error } = await supabase
    .from("gig_shares")
    .select("expires_at, gig:gigs(setlist_pdf_url)")
    .eq("token", slug)
    .eq("is_active", true)
    .single();

  if (error || !share || !share.gig) {
    return new NextResponse(null, { status: 404 });
  }

  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return new NextResponse(null, { status: 404 });
  }

  const pdfUrl = (share.gig as unknown as { setlist_pdf_url: string | null }).setlist_pdf_url;
  if (!pdfUrl) {
    return new NextResponse(null, { status: 404 });
  }

  // Fetch the actual PDF from Supabase storage
  const pdfResponse = await fetch(pdfUrl);
  if (!pdfResponse.ok) {
    return new NextResponse(null, { status: 502 });
  }

  const pdfBuffer = await pdfResponse.arrayBuffer();

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
