import { createClient } from '@/lib/supabase/client';
import type { GigReadiness, GigReadinessInsert, GigReadinessUpdate, ReadinessScore } from '@/lib/types/shared';

/**
 * Gig Readiness API
 * Functions for managing per-musician gig preparation tracking
 */

/**
 * Get readiness record for a specific gig and user
 * Returns null if no readiness record exists yet
 */
export async function getGigReadiness(
  gigId: string,
  musicianId: string
): Promise<GigReadiness | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('gig_readiness')
    .select('*')
    .eq('gig_id', gigId)
    .eq('musician_id', musicianId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching gig readiness:', error);
    throw error;
  }

  if (!data) {
    return null;
  }

  // Transform snake_case to camelCase
  return {
    id: data.id,
    gigId: data.gig_id,
    musicianId: data.musician_id,
    songsTotal: data.songs_total,
    songsLearned: data.songs_learned,
    chartsReady: data.charts_ready,
    soundsReady: data.sounds_ready,
    travelChecked: data.travel_checked,
    gearPacked: data.gear_packed,
    notes: data.notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Create a new readiness record for a gig and user
 * Uses upsert to handle cases where record might already exist
 */
export async function createGigReadiness(
  data: GigReadinessInsert
): Promise<GigReadiness> {
  const supabase = createClient();

  const { data: result, error } = await supabase
    .from('gig_readiness')
    .upsert({
      gig_id: data.gigId,
      musician_id: data.musicianId,
      songs_total: data.songsTotal,
      songs_learned: data.songsLearned,
      charts_ready: data.chartsReady,
      sounds_ready: data.soundsReady,
      travel_checked: data.travelChecked,
      gear_packed: data.gearPacked,
      notes: data.notes,
    }, {
      onConflict: 'gig_id,musician_id'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating gig readiness:', error);
    throw error;
  }

  // Transform snake_case to camelCase
  return {
    id: result.id,
    gigId: result.gig_id,
    musicianId: result.musician_id,
    songsTotal: result.songs_total,
    songsLearned: result.songs_learned,
    chartsReady: result.charts_ready,
    soundsReady: result.sounds_ready,
    travelChecked: result.travel_checked,
    gearPacked: result.gear_packed,
    notes: result.notes,
    createdAt: result.created_at,
    updatedAt: result.updated_at,
  };
}

/**
 * Update an existing readiness record
 */
export async function updateGigReadiness(
  gigId: string,
  musicianId: string,
  updates: GigReadinessUpdate
): Promise<GigReadiness> {
  const supabase = createClient();

  // Build update object with only provided fields
  const updateData: any = {};
  if (updates.songsTotal !== undefined) updateData.songs_total = updates.songsTotal;
  if (updates.songsLearned !== undefined) updateData.songs_learned = updates.songsLearned;
  if (updates.chartsReady !== undefined) updateData.charts_ready = updates.chartsReady;
  if (updates.soundsReady !== undefined) updateData.sounds_ready = updates.soundsReady;
  if (updates.travelChecked !== undefined) updateData.travel_checked = updates.travelChecked;
  if (updates.gearPacked !== undefined) updateData.gear_packed = updates.gearPacked;
  if (updates.notes !== undefined) updateData.notes = updates.notes;

  const { data, error } = await supabase
    .from('gig_readiness')
    .update(updateData)
    .eq('gig_id', gigId)
    .eq('musician_id', musicianId)
    .select()
    .single();

  if (error) {
    console.error('Error updating gig readiness:', error);
    throw error;
  }

  // Transform snake_case to camelCase
  return {
    id: data.id,
    gigId: data.gig_id,
    musicianId: data.musician_id,
    songsTotal: data.songs_total,
    songsLearned: data.songs_learned,
    chartsReady: data.charts_ready,
    soundsReady: data.sounds_ready,
    travelChecked: data.travel_checked,
    gearPacked: data.gear_packed,
    notes: data.notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Delete a readiness record
 */
export async function deleteGigReadiness(
  gigId: string,
  musicianId: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('gig_readiness')
    .delete()
    .eq('gig_id', gigId)
    .eq('musician_id', musicianId);

  if (error) {
    console.error('Error deleting gig readiness:', error);
    throw error;
  }
}

/**
 * Calculate readiness score breakdown from a readiness record
 * Returns percentages for each category and an overall score
 */
export function calculateReadinessScore(readiness: GigReadiness | null): ReadinessScore {
  if (!readiness) {
    return {
      overall: 0,
      songs: 0,
      charts: 0,
      sounds: 0,
      travel: 0,
      gear: 0,
    };
  }

  // Calculate individual percentages
  const songPercent = readiness.songsTotal > 0 
    ? Math.round((readiness.songsLearned / readiness.songsTotal) * 100)
    : 100; // If no songs, consider it complete
  
  const chartsPercent = readiness.chartsReady ? 100 : 0;
  const soundsPercent = readiness.soundsReady ? 100 : 0;
  const travelPercent = readiness.travelChecked ? 100 : 0;
  const gearPercent = readiness.gearPacked ? 100 : 0;

  // Calculate weighted overall score
  // Songs: 40% weight (most important)
  // Each checklist item: 15% weight (4 items = 60%)
  const songProgress = (songPercent / 100) * 40;
  const checklistProgress = (
    (chartsPercent + soundsPercent + travelPercent + gearPercent) / 400
  ) * 60;
  
  const overallPercent = Math.round(songProgress + checklistProgress);

  return {
    overall: overallPercent,
    songs: songPercent,
    charts: chartsPercent,
    sounds: soundsPercent,
    travel: travelPercent,
    gear: gearPercent,
  };
}

/**
 * Get or create default readiness for a gig
 * Useful for initializing readiness with setlist count
 */
export async function getOrCreateGigReadiness(
  gigId: string,
  musicianId: string,
  songsTotal: number = 0
): Promise<GigReadiness> {
  const existing = await getGigReadiness(gigId, musicianId);
  
  if (existing) {
    return existing;
  }

  // Create new with defaults
  return createGigReadiness({
    gigId,
    musicianId,
    songsTotal,
    songsLearned: 0,
    chartsReady: false,
    soundsReady: false,
    travelChecked: false,
    gearPacked: false,
    notes: null,
  });
}

