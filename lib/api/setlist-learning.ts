import { createClient } from '@/lib/supabase/client';
import type { SetlistLearningStatus, SetlistLearningStatusInsert, SetlistLearningStatusUpdate, PracticeItem } from '@/lib/types/shared';

/**
 * Setlist Learning Status API
 * Functions for tracking individual musician learning progress for songs
 */

/**
 * Get learning status for a specific setlist item and musician
 * Returns null if no learning status exists yet
 */
export async function getLearningStatus(
  setlistItemId: string,
  musicianId: string
): Promise<SetlistLearningStatus | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('setlist_learning_status')
    .select('*')
    .eq('setlist_item_id', setlistItemId)
    .eq('musician_id', musicianId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching learning status:', error);
    throw error;
  }

  if (!data) {
    return null;
  }

  // Transform snake_case to camelCase
  return {
    id: data.id,
    setlistItemId: data.setlist_item_id,
    musicianId: data.musician_id,
    learned: data.learned,
    lastPracticedAt: data.last_practiced_at,
    practiceCount: data.practice_count,
    difficulty: data.difficulty,
    priority: data.priority,
    notes: data.notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Upsert (create or update) learning status for a setlist item
 */
export async function upsertLearningStatus(
  data: SetlistLearningStatusInsert | SetlistLearningStatusUpdate & { setlistItemId: string; musicianId: string }
): Promise<SetlistLearningStatus> {
  const supabase = createClient();

  const dbData: any = {
    setlist_item_id: data.setlistItemId,
    musician_id: data.musicianId,
  };

  if ('learned' in data) dbData.learned = data.learned;
  if ('lastPracticedAt' in data) dbData.last_practiced_at = data.lastPracticedAt;
  if ('practiceCount' in data) dbData.practice_count = data.practiceCount;
  if ('difficulty' in data) dbData.difficulty = data.difficulty;
  if ('priority' in data) dbData.priority = data.priority;
  if ('notes' in data) dbData.notes = data.notes;

  const { data: result, error } = await supabase
    .from('setlist_learning_status')
    .upsert(dbData, {
      onConflict: 'setlist_item_id,musician_id'
    })
    .select()
    .single();

  if (error) {
    console.error('Error upserting learning status:', error);
    throw error;
  }

  // Transform snake_case to camelCase
  return {
    id: result.id,
    setlistItemId: result.setlist_item_id,
    musicianId: result.musician_id,
    learned: result.learned,
    lastPracticedAt: result.last_practiced_at,
    practiceCount: result.practice_count,
    difficulty: result.difficulty,
    priority: result.priority,
    notes: result.notes,
    createdAt: result.created_at,
    updatedAt: result.updated_at,
  };
}

/**
 * Mark a song as learned or unlearned
 * Creates learning status if it doesn't exist
 */
export async function toggleSongLearned(
  setlistItemId: string,
  musicianId: string,
  learned: boolean
): Promise<SetlistLearningStatus> {
  return upsertLearningStatus({
    setlistItemId,
    musicianId,
    learned,
  });
}

/**
 * Increment practice count and update last practiced timestamp
 */
export async function recordPracticeSession(
  setlistItemId: string,
  musicianId: string
): Promise<SetlistLearningStatus> {
  const supabase = createClient();

  // Get current status or create default
  const existing = await getLearningStatus(setlistItemId, musicianId);
  const currentCount = existing?.practiceCount || 0;

  return upsertLearningStatus({
    setlistItemId,
    musicianId,
    practiceCount: currentCount + 1,
    lastPracticedAt: new Date().toISOString(),
  });
}

/**
 * Get all learning statuses for a musician across all their gigs
 * Useful for analytics and progress tracking
 */
export async function getMusicianLearningStatuses(
  musicianId: string
): Promise<SetlistLearningStatus[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('setlist_learning_status')
    .select('*')
    .eq('musician_id', musicianId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching musician learning statuses:', error);
    throw error;
  }

  return data.map(item => ({
    id: item.id,
    setlistItemId: item.setlist_item_id,
    musicianId: item.musician_id,
    learned: item.learned,
    lastPracticedAt: item.last_practiced_at,
    practiceCount: item.practice_count,
    difficulty: item.difficulty,
    priority: item.priority,
    notes: item.notes,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }));
}

/**
 * Get practice items for dashboard "Practice Focus" widget
 * Returns songs from upcoming gigs that the musician hasn't learned yet
 * 
 * Note: setlist_items now uses section_id -> setlist_sections -> gigs (no direct gig_id)
 * 
 * @param musicianId - The musician's user ID
 * @param limit - Maximum number of items to return (default: 10)
 * @param priorityFilter - Filter by priority: 'high', 'medium', 'low', or 'all' (default: 'all')
 */
export async function getPracticeItems(
  musicianId: string,
  limit: number = 10,
  priorityFilter: 'high' | 'medium' | 'low' | 'all' = 'all'
): Promise<PracticeItem[]> {
  const supabase = createClient();

  // Get upcoming gigs for the musician (next 60 days)
  const today = new Date().toISOString().split('T')[0];
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 60);
  const future = futureDate.toISOString().split('T')[0];

  // STEP 1: Get gig IDs for this musician
  const { data: gigRoles, error: gigRolesError } = await supabase
    .from('gig_roles')
    .select('gig_id')
    .eq('musician_id', musicianId);

  if (gigRolesError) {
    console.error('Error fetching gig roles:', gigRolesError);
    return []; // Return empty instead of throwing for graceful degradation
  }

  if (!gigRoles || gigRoles.length === 0) {
    return [];
  }

  const gigIds = gigRoles.map(role => role.gig_id);

  // STEP 2: Get setlist items from those gigs via setlist_sections
  // Join path: setlist_items -> setlist_sections -> gigs
  const { data: setlistData, error: setlistError } = await supabase
    .from('setlist_items')
    .select(`
      id,
      title,
      key,
      tempo,
      sort_order,
      setlist_sections!inner (
      gig_id,
      gigs!inner (
        id,
        title,
        date,
        owner_id,
          owner:profiles!gigs_owner_profiles_fkey (
          name
          )
        )
      )
    `)
    .in('setlist_sections.gig_id', gigIds)
    .gte('setlist_sections.gigs.date', today)
    .lte('setlist_sections.gigs.date', future)
    .order('sort_order', { ascending: true });

  if (setlistError) {
    console.error('Error fetching setlist items:', setlistError);
    return []; // Return empty instead of throwing for graceful degradation
  }

  if (!setlistData || setlistData.length === 0) {
    return [];
  }

  // STEP 3: Get learning statuses for these setlist items
  const setlistItemIds = setlistData.map(item => item.id);
  const { data: learningStatuses, error: learningError } = await supabase
    .from('setlist_learning_status')
    .select('*')
    .eq('musician_id', musicianId)
    .in('setlist_item_id', setlistItemIds);

  if (learningError) {
    console.error('Error fetching learning statuses:', learningError);
    // Continue without learning statuses - treat all as unlearned
  }

  // Create a map for quick lookup
  const statusMap = new Map<string, any>();
  if (learningStatuses) {
    learningStatuses.forEach(status => {
      statusMap.set(status.setlist_item_id, status);
    });
  }

  // STEP 4: Transform and filter results
  const practiceItems: PracticeItem[] = [];
  const todayDate = new Date(today);

  for (const item of setlistData) {
    // Navigate through the new nested structure
    // @ts-ignore - Supabase nested types
    const section = item.setlist_sections;
    // @ts-ignore
    const gig = section?.gigs;
    
    if (!gig) continue;
    
    const learningStatus = statusMap.get(item.id);

    // Skip if already learned
    if (learningStatus?.learned) {
      continue;
    }

    const gigDate = new Date(gig.date);
    const daysUntilGig = Math.ceil((gigDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

    const priority = learningStatus?.priority || 'medium';

    // Apply priority filter
    if (priorityFilter !== 'all' && priority !== priorityFilter) {
      continue;
    }

    practiceItems.push({
      setlistItemId: item.id,
      songTitle: item.title,
      gigId: gig.id,
      gigTitle: gig.title,
      gigDate: gig.date,
      hostName: gig?.owner?.name || null,
      key: item.key,
      bpm: item.tempo, // Field is now 'tempo' in new schema
      learned: learningStatus?.learned || false,
      difficulty: learningStatus?.difficulty || null,
      priority,
      lastPracticedAt: learningStatus?.last_practiced_at || null,
      daysUntilGig,
    });
  }

  // Sort by priority (high first) then by days until gig (sooner first)
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  practiceItems.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return a.daysUntilGig - b.daysUntilGig;
  });

  return practiceItems.slice(0, limit);
}

/**
 * Get learning statistics for a musician
 * Returns counts of learned vs unlearned songs
 */
export async function getLearningStats(musicianId: string): Promise<{
  totalSongs: number;
  learned: number;
  unlearned: number;
  percentage: number;
}> {
  const statuses = await getMusicianLearningStatuses(musicianId);
  const learned = statuses.filter(s => s.learned).length;
  const unlearned = statuses.filter(s => !s.learned).length;
  const total = statuses.length;

  return {
    totalSongs: total,
    learned,
    unlearned,
    percentage: total > 0 ? Math.round((learned / total) * 100) : 0,
  };
}

