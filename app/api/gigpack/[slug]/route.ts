import { NextResponse } from "next/server";
import { getPublicGigPackDTO } from "@/lib/gigpack/getPublicGigPackDTO";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const data = await getPublicGigPackDTO(slug);

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

