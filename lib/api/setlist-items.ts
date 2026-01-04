import { createClient } from "@/lib/supabase/client";
import type { SetlistItem, SetlistItemInsert, SetlistItemUpdate } from "@/lib/types/shared";

export async function listSetlistItemsForGig(gigId: string): Promise<SetlistItem[]> {
  const supabase = createClient();

  const { data: items, error } = await supabase
    .from("setlist_items")
    .select("*")
    .eq("gig_id", gigId)
    .order("position", { ascending: true });

  if (error) throw new Error(error.message || "Failed to fetch setlist items");
  return items || [];
}

export async function addSetlistItem(
  data: Omit<SetlistItemInsert, "id" | "created_at" | "updated_at">
): Promise<SetlistItem> {
  const supabase = createClient();

  // If position is not provided, assign the next position
  let insertData = { ...data };
  if (!insertData.position) {
    // Get the max position for this gig
    const { data: existingItems } = await supabase
      .from("setlist_items")
      .select("position")
      .eq("gig_id", data.gig_id)
      .order("position", { ascending: false })
      .limit(1);

    const maxPosition = existingItems?.[0]?.position || 0;
    insertData.position = maxPosition + 1;
  }

  const { data: item, error } = await supabase
    .from("setlist_items")
    .insert(insertData)
    .select()
    .single();

  if (error) throw new Error(error.message || "Failed to add setlist item");
  return item;
}

export async function updateSetlistItem(
  itemId: string,
  data: SetlistItemUpdate
): Promise<SetlistItem> {
  const supabase = createClient();

  const { data: item, error } = await supabase
    .from("setlist_items")
    .update(data)
    .eq("id", itemId)
    .select()
    .single();

  if (error) throw new Error(error.message || "Failed to update setlist item");
  return item;
}

export async function deleteSetlistItem(itemId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("setlist_items")
    .delete()
    .eq("id", itemId);

  if (error) throw new Error(error.message || "Failed to delete setlist item");
}

