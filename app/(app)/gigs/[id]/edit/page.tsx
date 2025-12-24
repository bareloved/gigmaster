import { GigEditorWrapper } from "../../editor-wrapper";
import { getGig } from "../../actions";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditGigPage({ params }: PageProps) {
  const { id } = await params;
  const gig = await getGig(id);

  if (!gig) {
    notFound();
  }

  return <GigEditorWrapper mode="edit" gig={gig} />;
}

