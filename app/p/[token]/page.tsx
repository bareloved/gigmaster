import { notFound } from "next/navigation";
import { getPublicGigPackDTO } from "@/lib/gigpack/getPublicGigPackDTO";
import { PublicGigPackView } from "@/components/gigpack/public-gigpack-view";
import { Metadata } from "next";

type Params = Promise<{ token: string }>;

interface PageProps {
  params: Params;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const data = await getPublicGigPackDTO(token);
  
  if (!data) return {};

  return {
    title: data.title,
    description: `Gig Pack for ${data.title} - ${data.date ? new Date(data.date).toLocaleDateString() : ''}`,
  };
}

export default async function PublicGigPackPage({ params }: PageProps) {
  const { token } = await params;
  const data = await getPublicGigPackDTO(token);

  if (!data) {
    notFound();
  }

  return (
    <PublicGigPackView 
      initialGigPack={data} 
      slug={token} 
      locale="en"
    />
  );
}

