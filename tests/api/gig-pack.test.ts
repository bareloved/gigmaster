import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { getGigPackFull, getGigPack } from "@/lib/api/gig-pack";
import { createChainableMock } from "../mocks/supabase";

// Mock the Supabase client module
vi.mock("@/lib/supabase/client");

// Mock the transforms module so we can control their outputs
// and avoid testing transform internals here
vi.mock("@/lib/gigpack/transforms", () => ({
  transformScheduleItems: vi.fn((rows: Array<{ id: string; time: string | null; label: string; sort_order: number | null }>) =>
    rows.map((r) => ({ id: r.id, time: r.time, label: r.label }))
  ),
  transformLineup: vi.fn().mockResolvedValue([]),
  transformMaterials: vi.fn((rows: Array<{ id: string; label: string; url: string; kind: string }>) =>
    rows.map((m) => ({ id: m.id, label: m.label, url: m.url, kind: m.kind }))
  ),
  transformPackingChecklist: vi.fn((rows: Array<{ id: string; label: string }>) =>
    rows.map((item) => ({ id: item.id, label: item.label }))
  ),
  transformSetlistStructured: vi.fn(() => []),
}));

// ============================================================================
// Test fixtures
// ============================================================================

function createMockGigRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "gig-1",
    owner_id: "owner-1",
    title: "Friday Night Jazz",
    status: "confirmed",
    band_id: "band-1",
    band_name: "The Jazz Quartet",
    date: "2024-12-15",
    call_time: "19:00",
    start_time: "20:00",
    end_time: "23:00",
    on_stage_time: "20:30",
    location_name: "Blue Note Jazz Club",
    location_address: "131 W 3rd St, NY",
    venue_name: "Blue Note",
    venue_address: "131 W 3rd St, NY",
    venue_maps_url: "https://maps.example.com/blue-note",
    internal_notes: "Sound check at 18:00",
    setlist: null,
    setlist_pdf_url: null,
    dress_code: "Smart casual",
    backline_notes: "House piano available",
    parking_notes: "Street parking only",
    payment_notes: "Cash on the night",
    notes: "Great venue",
    gig_type: "club",
    theme: "minimal",
    poster_skin: "clean",
    accent_color: "#ff0000",
    band_logo_url: null,
    hero_image_url: null,
    is_external: false,
    external_event_url: null,
    schedule_notes: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
    owner: { id: "owner-1", name: "Test Owner" },
    gig_schedule_items: [],
    gig_materials: [],
    gig_packing_items: [],
    gig_shares: [],
    gig_roles: [],
    gig_contacts: [],
    ...overrides,
  };
}

function createMockPersonRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "role-1",
    role_name: "Keys",
    musician_name: "John Doe",
    invitation_status: "accepted",
    sort_order: 0,
    ...overrides,
  };
}

function createMockUserRole(overrides: Record<string, unknown> = {}) {
  return {
    id: "role-user-1",
    role_name: "Drums",
    invitation_status: "accepted",
    agreed_fee: 500,
    payment_status: "pending",
    paid_at: null,
    notes: "Bring sticks",
    player_notes: "My personal notes",
    currency: "USD",
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("Gig Pack API", () => {
  const mockSupabase = {
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the from mock's return value queue so stale mockReturnValueOnce
    // values from previous tests don't leak. mockReset clears implementations
    // AND return value queues, so we call it only on `from`.
    mockSupabase.from.mockReset();
    vi.mocked(createClient).mockReturnValue(
      mockSupabase as unknown as ReturnType<typeof createClient>
    );
  });

  // ==========================================================================
  // getGigPackFull
  // ==========================================================================

  describe("getGigPackFull", () => {
    it("should return a full GigPack object for a valid gig", async () => {
      const mockGig = createMockGigRow();

      // First call: gigs query
      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: mockGig, error: null })
      );
      // Second call: setlist_sections query
      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: [], error: null })
      );

      const result = await getGigPackFull("gig-1");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("gig-1");
      expect(result!.owner_id).toBe("owner-1");
      expect(result!.title).toBe("Friday Night Jazz");
      expect(result!.status).toBe("confirmed");
      expect(result!.band_id).toBe("band-1");
      expect(result!.band_name).toBe("The Jazz Quartet");
      expect(result!.date).toBe("2024-12-15");
      expect(result!.call_time).toBe("19:00");
      expect(result!.on_stage_time).toBe("20:30");
      expect(result!.venue_name).toBe("Blue Note");
      expect(result!.venue_address).toBe("131 W 3rd St, NY");
      expect(result!.venue_maps_url).toBe("https://maps.example.com/blue-note");
      expect(result!.dress_code).toBe("Smart casual");
      expect(result!.backline_notes).toBe("House piano available");
      expect(result!.parking_notes).toBe("Street parking only");
      expect(result!.payment_notes).toBe("Cash on the night");
      expect(result!.notes).toBe("Great venue");
      expect(result!.theme).toBe("minimal");
      expect(result!.poster_skin).toBe("clean");
      expect(result!.gig_type).toBe("club");
      expect(result!.is_archived).toBe(false);
      expect(result!.is_external).toBe(false);
    });

    it("should return null when the gig query errors", async () => {
      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({
          data: null,
          error: { message: "Not found" },
        })
      );

      const result = await getGigPackFull("nonexistent");

      expect(result).toBeNull();
    });

    it("should return null when gig data is null", async () => {
      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: null, error: null })
      );

      const result = await getGigPackFull("nonexistent");

      expect(result).toBeNull();
    });

    it("should return null when gig has no owner_id", async () => {
      const mockGig = createMockGigRow({ owner_id: null });

      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: mockGig, error: null })
      );
      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: [], error: null })
      );

      const result = await getGigPackFull("gig-1");

      expect(result).toBeNull();
    });

    it("should use share token as public_slug when available", async () => {
      const mockGig = createMockGigRow({
        gig_shares: [{ token: "share-token-abc" }],
      });

      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: mockGig, error: null })
      );
      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: [], error: null })
      );

      const result = await getGigPackFull("gig-1");

      expect(result!.public_slug).toBe("share-token-abc");
    });

    it("should use gig id as public_slug when no share token exists", async () => {
      const mockGig = createMockGigRow({ gig_shares: [] });

      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: mockGig, error: null })
      );
      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: [], error: null })
      );

      const result = await getGigPackFull("gig-1");

      expect(result!.public_slug).toBe("gig-1");
    });

    it("should set is_archived to true when status is cancelled", async () => {
      const mockGig = createMockGigRow({ status: "cancelled" });

      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: mockGig, error: null })
      );
      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: [], error: null })
      );

      const result = await getGigPackFull("gig-1");

      expect(result!.is_archived).toBe(true);
    });

    it("should set is_archived to false for non-cancelled gigs", async () => {
      const mockGig = createMockGigRow({ status: "tentative" });

      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: mockGig, error: null })
      );
      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: [], error: null })
      );

      const result = await getGigPackFull("gig-1");

      expect(result!.is_archived).toBe(false);
    });

    it("should fall back to start_time for call_time when call_time is null", async () => {
      const mockGig = createMockGigRow({
        call_time: null,
        start_time: "20:00:00",
      });

      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: mockGig, error: null })
      );
      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: [], error: null })
      );

      const result = await getGigPackFull("gig-1");

      expect(result!.call_time).toBe("20:00");
    });

    it("should fall back to location_name when venue_name is null", async () => {
      const mockGig = createMockGigRow({
        venue_name: null,
        location_name: "Fallback Location",
        venue_address: null,
        location_address: "Fallback Address",
      });

      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: mockGig, error: null })
      );
      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: [], error: null })
      );

      const result = await getGigPackFull("gig-1");

      expect(result!.venue_name).toBe("Fallback Location");
      expect(result!.venue_address).toBe("Fallback Address");
    });

    it("should use schedule_notes JSONB as fallback when no schedule items exist", async () => {
      const mockGig = createMockGigRow({
        gig_schedule_items: [],
        schedule_notes: [
          { time: "17:00", label: "Load-in" },
          { time: "18:00", label: "Soundcheck" },
        ],
      });

      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: mockGig, error: null })
      );
      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: [], error: null })
      );

      const result = await getGigPackFull("gig-1");

      expect(result!.schedule).toHaveLength(2);
      expect(result!.schedule![0]).toEqual({
        id: "sn-0",
        time: "17:00",
        label: "Load-in",
      });
      expect(result!.schedule![1]).toEqual({
        id: "sn-1",
        time: "18:00",
        label: "Soundcheck",
      });
    });

    it("should append end_time as schedule entry for external gigs", async () => {
      const mockGig = createMockGigRow({
        is_external: true,
        end_time: "23:00:00",
        gig_schedule_items: [],
        schedule_notes: null,
      });

      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: mockGig, error: null })
      );
      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: [], error: null })
      );

      const result = await getGigPackFull("gig-1");

      expect(result!.schedule).toHaveLength(1);
      expect(result!.schedule![0]).toEqual({
        id: "end-time",
        time: "23:00",
        label: "End",
      });
    });

    it("should not duplicate end_time when it already appears in schedule", async () => {
      const mockGig = createMockGigRow({
        is_external: true,
        end_time: "23:00:00",
        gig_schedule_items: [],
        schedule_notes: [{ time: "23:00", label: "Finish" }],
      });

      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: mockGig, error: null })
      );
      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: [], error: null })
      );

      const result = await getGigPackFull("gig-1");

      // Only the schedule_notes entry; end_time should not be appended
      expect(result!.schedule).toHaveLength(1);
      expect(result!.schedule![0].label).toBe("Finish");
    });

    it("should return null arrays when related data is empty", async () => {
      const mockGig = createMockGigRow({
        gig_schedule_items: [],
        gig_materials: [],
        gig_packing_items: [],
        gig_roles: [],
        gig_contacts: [],
      });

      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: mockGig, error: null })
      );
      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: [], error: null })
      );

      const result = await getGigPackFull("gig-1");

      expect(result!.lineup).toBeNull();
      expect(result!.materials).toBeNull();
      expect(result!.packing_checklist).toBeNull();
      expect(result!.contacts).toBeNull();
      expect(result!.schedule).toBeNull();
    });

    it("should sort and transform contacts correctly", async () => {
      const mockGig = createMockGigRow({
        gig_contacts: [
          {
            id: "c-2",
            label: "Sound Engineer",
            name: "Bob",
            phone: "555-2222",
            email: "bob@example.com",
            source_type: "manual",
            source_id: null,
            sort_order: 2,
          },
          {
            id: "c-1",
            label: "Venue Manager",
            name: "Alice",
            phone: "555-1111",
            email: "alice@example.com",
            source_type: "lineup",
            source_id: "role-1",
            sort_order: 1,
          },
        ],
      });

      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: mockGig, error: null })
      );
      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: [], error: null })
      );

      const result = await getGigPackFull("gig-1");

      expect(result!.contacts).toHaveLength(2);
      // Should be sorted by sort_order ascending
      expect(result!.contacts![0].name).toBe("Alice");
      expect(result!.contacts![0].sourceType).toBe("lineup");
      expect(result!.contacts![0].sourceId).toBe("role-1");
      expect(result!.contacts![1].name).toBe("Bob");
      expect(result!.contacts![1].sourceType).toBe("manual");
    });

    it("should generate setlist text from structured setlist when no raw text exists", async () => {
      const { transformSetlistStructured } = await import("@/lib/gigpack/transforms");
      vi.mocked(transformSetlistStructured).mockReturnValueOnce([
        {
          id: "sec-1",
          name: "Set 1",
          songs: [
            { id: "s-1", title: "Autumn Leaves", artist: "Chet Baker", key: "Gm", tempo: "120" },
            { id: "s-2", title: "Blue Bossa", key: "Cm" },
          ],
        },
      ]);

      const mockGig = createMockGigRow({ setlist: null });

      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: mockGig, error: null })
      );
      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({
          data: [{ id: "sec-1", name: "Set 1", sort_order: 0, setlist_items: [] }],
          error: null,
        })
      );

      const result = await getGigPackFull("gig-1");

      expect(result!.setlist).toContain("Autumn Leaves - Chet Baker | Gm 120 BPM");
      expect(result!.setlist).toContain("Blue Bossa");
    });

    it("should keep existing setlist text over generated text", async () => {
      const mockGig = createMockGigRow({
        setlist: "Song 1\nSong 2\nSong 3",
      });

      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: mockGig, error: null })
      );
      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: [], error: null })
      );

      const result = await getGigPackFull("gig-1");

      expect(result!.setlist).toBe("Song 1\nSong 2\nSong 3");
    });

    it("should default theme to 'minimal' when null", async () => {
      const mockGig = createMockGigRow({ theme: null });

      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: mockGig, error: null })
      );
      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: [], error: null })
      );

      const result = await getGigPackFull("gig-1");

      expect(result!.theme).toBe("minimal");
    });

    it("should default poster_skin to 'clean' when null", async () => {
      const mockGig = createMockGigRow({ poster_skin: null });

      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: mockGig, error: null })
      );
      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: [], error: null })
      );

      const result = await getGigPackFull("gig-1");

      expect(result!.poster_skin).toBe("clean");
    });

    it("should default date to current ISO string when null", async () => {
      const mockGig = createMockGigRow({ date: null });

      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: mockGig, error: null })
      );
      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: [], error: null })
      );

      const result = await getGigPackFull("gig-1");

      // Should be a valid ISO date string (fallback to new Date().toISOString())
      expect(result!.date).toBeTruthy();
      expect(new Date(result!.date!).toISOString()).toBe(result!.date);
    });

    it("should handle materials with populated data", async () => {
      const { transformMaterials } = await import("@/lib/gigpack/transforms");
      vi.mocked(transformMaterials).mockReturnValueOnce([
        { id: "mat-1", label: "Lead Sheet", url: "https://drive.google.com/sheet1", kind: "chart" },
      ]);

      const mockGig = createMockGigRow({
        gig_materials: [
          { id: "mat-1", label: "Lead Sheet", url: "https://drive.google.com/sheet1", kind: "chart", sort_order: 0 },
        ],
      });

      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: mockGig, error: null })
      );
      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: [], error: null })
      );

      const result = await getGigPackFull("gig-1");

      expect(result!.materials).toHaveLength(1);
      expect(result!.materials![0].label).toBe("Lead Sheet");
    });

    it("should handle packing checklist items", async () => {
      const { transformPackingChecklist } = await import("@/lib/gigpack/transforms");
      vi.mocked(transformPackingChecklist).mockReturnValueOnce([
        { id: "pack-1", label: "Guitar" },
        { id: "pack-2", label: "Amp" },
      ]);

      const mockGig = createMockGigRow({
        gig_packing_items: [
          { id: "pack-1", label: "Guitar", sort_order: 0 },
          { id: "pack-2", label: "Amp", sort_order: 1 },
        ],
      });

      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: mockGig, error: null })
      );
      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: [], error: null })
      );

      const result = await getGigPackFull("gig-1");

      expect(result!.packing_checklist).toHaveLength(2);
      expect(result!.packing_checklist![0].label).toBe("Guitar");
    });

    it("should handle null setlistSections from second query", async () => {
      const mockGig = createMockGigRow();

      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: mockGig, error: null })
      );
      // Simulate null data from setlist_sections query
      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: null, error: null })
      );

      const result = await getGigPackFull("gig-1");

      expect(result).not.toBeNull();
      expect(result!.setlist_structured).toBeNull();
    });

    it("should handle schedule_notes without time field", async () => {
      const mockGig = createMockGigRow({
        gig_schedule_items: [],
        schedule_notes: [
          { time: "", label: "Load-in" },
          { time: "18:00", label: "Soundcheck" },
        ],
      });

      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: mockGig, error: null })
      );
      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: [], error: null })
      );

      const result = await getGigPackFull("gig-1");

      expect(result!.schedule).toHaveLength(2);
      // Empty string time is falsy, so the source maps it via `item.time || null`
      // which yields null for empty strings
      expect(result!.schedule![0].time).toBeNull();
      expect(result!.schedule![1].time).toBe("18:00");
    });

    it("should pass all nullable fields as null when not present on gig", async () => {
      const mockGig = createMockGigRow({
        status: null,
        band_id: null,
        band_name: null,
        call_time: null,
        start_time: null,
        on_stage_time: null,
        venue_name: null,
        location_name: null,
        venue_address: null,
        location_address: null,
        venue_maps_url: null,
        dress_code: null,
        backline_notes: null,
        parking_notes: null,
        payment_notes: null,
        notes: null,
        internal_notes: null,
        setlist_pdf_url: null,
        band_logo_url: null,
        hero_image_url: null,
        accent_color: null,
        gig_type: null,
      });

      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: mockGig, error: null })
      );
      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({ data: [], error: null })
      );

      const result = await getGigPackFull("gig-1");

      expect(result!.status).toBeNull();
      expect(result!.band_id).toBeNull();
      expect(result!.band_name).toBeNull();
      expect(result!.call_time).toBeNull();
      expect(result!.on_stage_time).toBeNull();
      expect(result!.venue_name).toBeNull();
      expect(result!.venue_address).toBeNull();
      expect(result!.venue_maps_url).toBeNull();
      expect(result!.dress_code).toBeNull();
      expect(result!.backline_notes).toBeNull();
      expect(result!.parking_notes).toBeNull();
      expect(result!.payment_notes).toBeNull();
      expect(result!.notes).toBeNull();
      expect(result!.internal_notes).toBeNull();
      expect(result!.setlist_pdf_url).toBeNull();
      expect(result!.band_logo_url).toBeNull();
      expect(result!.hero_image_url).toBeNull();
      expect(result!.accent_color).toBeNull();
      expect(result!.gig_type).toBeNull();
    });
  });

  // ==========================================================================
  // getGigPack
  // ==========================================================================

  describe("getGigPack", () => {
    /**
     * Helper to set up all four sequential `from()` calls for getGigPack:
     * 1. gigs (single)
     * 2. setlist_sections
     * 3. gig_roles (people)
     * 4. gig_roles (userRole, maybeSingle)
     */
    function setupGetGigPackMocks(options: {
      gig?: Record<string, unknown> | null;
      gigError?: Record<string, unknown> | null;
      setlistSections?: unknown[] | null;
      setlistError?: Record<string, unknown> | null;
      people?: unknown[] | null;
      peopleError?: Record<string, unknown> | null;
      userRole?: Record<string, unknown> | null;
      userRoleError?: Record<string, unknown> | null;
    }) {
      const gigData = "gig" in options ? options.gig : createMockGigRow();
      const setlistData = "setlistSections" in options ? options.setlistSections : [];
      const peopleData = "people" in options ? options.people : [];
      const userRoleData = "userRole" in options ? options.userRole : null;

      // 1. gigs query
      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({
          data: gigData,
          error: options.gigError ?? null,
        })
      );
      // 2. setlist_sections query
      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({
          data: setlistData,
          error: options.setlistError ?? null,
        })
      );
      // 3. gig_roles (people) query
      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({
          data: peopleData,
          error: options.peopleError ?? null,
        })
      );
      // 4. gig_roles (userRole) query
      mockSupabase.from.mockReturnValueOnce(
        createChainableMock({
          data: userRoleData,
          error: options.userRoleError ?? null,
        })
      );
    }

    it("should return GigPackData for a valid gig", async () => {
      setupGetGigPackMocks({
        gig: createMockGigRow(),
        people: [createMockPersonRow()],
        userRole: createMockUserRole(),
      });

      const result = await getGigPack("gig-1", "user-1");

      expect(result.id).toBe("gig-1");
      expect(result.title).toBe("Friday Night Jazz");
      expect(result.date).toBe("2024-12-15");
      expect(result.startTime).toBe("19:00");
      expect(result.endTime).toBe("20:30");
      expect(result.locationName).toBe("Blue Note");
      expect(result.locationAddress).toBe("131 W 3rd St, NY");
      expect(result.status).toBe("confirmed");
      expect(result.notes).toBe("Sound check at 18:00");
      expect(result.isExternal).toBe(false);
      expect(result.externalEventUrl).toBeNull();
    });

    it("should throw when gig query returns an error", async () => {
      setupGetGigPackMocks({
        gig: null,
        gigError: { message: "Permission denied" },
      });

      await expect(getGigPack("gig-1", "user-1")).rejects.toEqual({
        message: "Permission denied",
      });
    });

    it("should throw when gig data is null", async () => {
      setupGetGigPackMocks({ gig: null });

      await expect(getGigPack("gig-1", "user-1")).rejects.toThrow(
        "Gig not found"
      );
    });

    it("should throw when people query returns an error", async () => {
      setupGetGigPackMocks({
        peopleError: { message: "People query failed" },
        people: null,
      });

      await expect(getGigPack("gig-1", "user-1")).rejects.toEqual({
        message: "People query failed",
      });
    });

    it("should map host from owner profile", async () => {
      setupGetGigPackMocks({
        gig: createMockGigRow({
          owner: { id: "owner-1", name: "Jane Manager" },
        }),
      });

      const result = await getGigPack("gig-1", "user-1");

      expect(result.host).toEqual({
        id: "owner-1",
        name: "Jane Manager",
      });
    });

    it("should set host name to 'Unknown' when owner name is null", async () => {
      setupGetGigPackMocks({
        gig: createMockGigRow({
          owner: { id: "owner-1", name: null },
        }),
      });

      const result = await getGigPack("gig-1", "user-1");

      expect(result.host!.name).toBe("Unknown");
    });

    it("should set host to null when owner is null", async () => {
      setupGetGigPackMocks({
        gig: createMockGigRow({ owner: null }),
      });

      const result = await getGigPack("gig-1", "user-1");

      expect(result.host).toBeNull();
    });

    it("should map people with correct field names", async () => {
      const people = [
        createMockPersonRow({ id: "r-1", role_name: "Keys", musician_name: "John", invitation_status: "accepted", sort_order: 0 }),
        createMockPersonRow({ id: "r-2", role_name: "Bass", musician_name: "Jane", invitation_status: "pending", sort_order: 1 }),
      ];

      setupGetGigPackMocks({ people });

      const result = await getGigPack("gig-1", "user-1");

      expect(result.people).toHaveLength(2);
      expect(result.people[0]).toEqual({
        id: "r-1",
        roleName: "Keys",
        musicianName: "John",
        invitationStatus: "accepted",
      });
      expect(result.people[1]).toEqual({
        id: "r-2",
        roleName: "Bass",
        musicianName: "Jane",
        invitationStatus: "pending",
      });
    });

    it("should default invitation_status to 'pending' when null", async () => {
      const people = [
        createMockPersonRow({ invitation_status: null }),
      ];

      setupGetGigPackMocks({ people });

      const result = await getGigPack("gig-1", "user-1");

      expect(result.people[0].invitationStatus).toBe("pending");
    });

    it("should return empty people array when no roles exist", async () => {
      setupGetGigPackMocks({ people: [] });

      const result = await getGigPack("gig-1", "user-1");

      expect(result.people).toEqual([]);
    });

    it("should map userRole correctly when user has a role", async () => {
      setupGetGigPackMocks({
        userRole: createMockUserRole({
          id: "my-role",
          role_name: "Guitar",
          invitation_status: "accepted",
          agreed_fee: 750,
          payment_status: "paid",
          paid_at: "2024-12-16T10:00:00Z",
          notes: "Manager notes",
          player_notes: "My notes",
          currency: "USD",
        }),
      });

      const result = await getGigPack("gig-1", "user-1");

      expect(result.userRole).toEqual({
        roleId: "my-role",
        roleName: "Guitar",
        invitationStatus: "accepted",
        agreedFee: 750,
        isPaid: true,
        paidAt: "2024-12-16T10:00:00Z",
        currency: "USD",
        notes: "Manager notes",
        playerNotes: "My notes",
      });
    });

    it("should set isPaid to false when payment_status is not 'paid'", async () => {
      setupGetGigPackMocks({
        userRole: createMockUserRole({ payment_status: "pending" }),
      });

      const result = await getGigPack("gig-1", "user-1");

      expect(result.userRole!.isPaid).toBe(false);
    });

    it("should default userRole currency to 'ILS' when null", async () => {
      setupGetGigPackMocks({
        userRole: createMockUserRole({ currency: null }),
      });

      const result = await getGigPack("gig-1", "user-1");

      expect(result.userRole!.currency).toBe("ILS");
    });

    it("should set userRole to null when user has no role", async () => {
      setupGetGigPackMocks({ userRole: null });

      const result = await getGigPack("gig-1", "user-1");

      expect(result.userRole).toBeNull();
    });

    it("should not throw when setlist query errors (setlist is optional)", async () => {
      setupGetGigPackMocks({
        setlistError: { message: "Setlist table error" },
        setlistSections: null,
      });

      const result = await getGigPack("gig-1", "user-1");

      // Should still return data even if setlist fails
      expect(result.id).toBe("gig-1");
      expect(result.setlist).toEqual([]);
    });

    it("should flatten setlist sections into a numbered list", async () => {
      setupGetGigPackMocks({
        setlistSections: [
          {
            id: "sec-1",
            name: "Set 1",
            sort_order: 0,
            setlist_items: [
              { id: "s-1", title: "Song A", artist: null, key: "C", tempo: "120", notes: "Solo section", sort_order: 0 },
              { id: "s-2", title: "Song B", artist: null, key: null, tempo: null, notes: null, sort_order: 1 },
            ],
          },
          {
            id: "sec-2",
            name: "Set 2",
            sort_order: 1,
            setlist_items: [
              { id: "s-3", title: "Song C", artist: null, key: "G", tempo: "90", notes: null, sort_order: 0 },
            ],
          },
        ],
      });

      const result = await getGigPack("gig-1", "user-1");

      expect(result.setlist).toHaveLength(3);
      expect(result.setlist[0]).toEqual({
        id: "s-1",
        position: 1,
        title: "Song A",
        key: "C",
        bpm: 120,
        notes: "Solo section",
      });
      expect(result.setlist[1]).toEqual({
        id: "s-2",
        position: 2,
        title: "Song B",
        key: null,
        bpm: null,
        notes: null,
      });
      expect(result.setlist[2]).toEqual({
        id: "s-3",
        position: 3,
        title: "Song C",
        key: "G",
        bpm: 90,
        notes: null,
      });
    });

    it("should parse tempo as integer and return null for non-numeric tempo", async () => {
      setupGetGigPackMocks({
        setlistSections: [
          {
            id: "sec-1",
            name: "Set 1",
            sort_order: 0,
            setlist_items: [
              { id: "s-1", title: "Song A", artist: null, key: null, tempo: "not-a-number", notes: null, sort_order: 0 },
            ],
          },
        ],
      });

      const result = await getGigPack("gig-1", "user-1");

      expect(result.setlist[0].bpm).toBeNull();
    });

    it("should parse simple text setlist when no structured setlist exists", async () => {
      setupGetGigPackMocks({
        gig: createMockGigRow({
          setlist: "Song 1\nSong 2\n\nSong 3",
        }),
        setlistSections: [],
      });

      const result = await getGigPack("gig-1", "user-1");

      // Empty lines should be filtered out
      expect(result.setlist).toHaveLength(3);
      expect(result.setlist[0]).toEqual({
        id: "text-0",
        position: 1,
        title: "Song 1",
        key: null,
        bpm: null,
        notes: null,
      });
      expect(result.setlist[2]).toEqual({
        id: "text-2",
        position: 3,
        title: "Song 3",
        key: null,
        bpm: null,
        notes: null,
      });
    });

    it("should return empty setlist when no text and no sections exist", async () => {
      setupGetGigPackMocks({
        gig: createMockGigRow({ setlist: null }),
        setlistSections: [],
      });

      const result = await getGigPack("gig-1", "user-1");

      expect(result.setlist).toEqual([]);
    });

    it("should build schedule text from schedule items", async () => {
      setupGetGigPackMocks({
        gig: createMockGigRow({
          gig_schedule_items: [
            { id: "si-1", time: "17:00", label: "Load-in", sort_order: 0 },
            { id: "si-2", time: null, label: "Break", sort_order: 2 },
            { id: "si-3", time: "18:00", label: "Soundcheck", sort_order: 1 },
          ],
        }),
      });

      const result = await getGigPack("gig-1", "user-1");

      // Should be sorted by sort_order and formatted
      expect(result.schedule).toBe("17:00 - Load-in\n18:00 - Soundcheck\nBreak");
    });

    it("should return null schedule when no schedule items exist", async () => {
      setupGetGigPackMocks({
        gig: createMockGigRow({ gig_schedule_items: [] }),
      });

      const result = await getGigPack("gig-1", "user-1");

      expect(result.schedule).toBeNull();
    });

    it("should map resources from gig_materials sorted by sort_order", async () => {
      setupGetGigPackMocks({
        gig: createMockGigRow({
          gig_materials: [
            { id: "m-2", label: "Recording", url: "https://drive.google.com/rec", kind: "recording", sort_order: 2 },
            { id: "m-1", label: "Chart", url: "https://drive.google.com/chart", kind: "chart", sort_order: 1 },
          ],
        }),
      });

      const result = await getGigPack("gig-1", "user-1");

      expect(result.resources).toHaveLength(2);
      expect(result.resources[0]).toEqual({
        id: "m-1",
        label: "Chart",
        url: "https://drive.google.com/chart",
        type: "chart",
      });
      expect(result.resources[1]).toEqual({
        id: "m-2",
        label: "Recording",
        url: "https://drive.google.com/rec",
        type: "recording",
      });
    });

    it("should return empty resources array when no materials exist", async () => {
      setupGetGigPackMocks({
        gig: createMockGigRow({ gig_materials: [] }),
      });

      const result = await getGigPack("gig-1", "user-1");

      expect(result.resources).toEqual([]);
    });

    it("should use call_time for startTime and on_stage_time for endTime", async () => {
      setupGetGigPackMocks({
        gig: createMockGigRow({
          call_time: "18:30",
          on_stage_time: "21:00",
        }),
      });

      const result = await getGigPack("gig-1", "user-1");

      expect(result.startTime).toBe("18:30");
      expect(result.endTime).toBe("21:00");
    });

    it("should fall back to start_time when call_time is null", async () => {
      setupGetGigPackMocks({
        gig: createMockGigRow({
          call_time: null,
          start_time: "19:30",
        }),
      });

      const result = await getGigPack("gig-1", "user-1");

      expect(result.startTime).toBe("19:30");
    });

    it("should fall back to end_time when on_stage_time is null", async () => {
      setupGetGigPackMocks({
        gig: createMockGigRow({
          on_stage_time: null,
          end_time: "23:30",
        }),
      });

      const result = await getGigPack("gig-1", "user-1");

      expect(result.endTime).toBe("23:30");
    });

    it("should fall back to location_name/address when venue fields are null", async () => {
      setupGetGigPackMocks({
        gig: createMockGigRow({
          venue_name: null,
          venue_address: null,
          location_name: "Backup Venue",
          location_address: "123 Backup St",
        }),
      });

      const result = await getGigPack("gig-1", "user-1");

      expect(result.locationName).toBe("Backup Venue");
      expect(result.locationAddress).toBe("123 Backup St");
    });

    it("should default status to 'confirmed' when null", async () => {
      setupGetGigPackMocks({
        gig: createMockGigRow({ status: null }),
      });

      const result = await getGigPack("gig-1", "user-1");

      expect(result.status).toBe("confirmed");
    });

    it("should handle external gig fields", async () => {
      setupGetGigPackMocks({
        gig: createMockGigRow({
          is_external: true,
          external_event_url: "https://calendar.google.com/event/123",
          schedule_notes: [
            { time: "17:00", label: "Load-in", notes: "Back entrance" },
          ],
        }),
      });

      const result = await getGigPack("gig-1", "user-1");

      expect(result.isExternal).toBe(true);
      expect(result.externalEventUrl).toBe("https://calendar.google.com/event/123");
      expect(result.scheduleNotes).toEqual([
        { time: "17:00", label: "Load-in", notes: "Back entrance" },
      ]);
    });

    it("should handle null external fields gracefully", async () => {
      setupGetGigPackMocks({
        gig: createMockGigRow({
          is_external: null,
          external_event_url: null,
          schedule_notes: null,
        }),
      });

      const result = await getGigPack("gig-1", "user-1");

      expect(result.isExternal).toBe(false);
      expect(result.externalEventUrl).toBeNull();
      expect(result.scheduleNotes).toBeNull();
    });

    it("should not throw when userRole query errors (role is optional)", async () => {
      setupGetGigPackMocks({
        userRoleError: { message: "Role query failed" },
        userRole: null,
      });

      const result = await getGigPack("gig-1", "user-1");

      // userRole error is logged but not thrown
      expect(result.userRole).toBeNull();
    });

    it("should call from('gigs') first", async () => {
      setupGetGigPackMocks({});

      await getGigPack("gig-1", "user-1");

      expect(mockSupabase.from).toHaveBeenNthCalledWith(1, "gigs");
    });

    it("should call from('setlist_sections') second", async () => {
      setupGetGigPackMocks({});

      await getGigPack("gig-1", "user-1");

      expect(mockSupabase.from).toHaveBeenNthCalledWith(2, "setlist_sections");
    });

    it("should call from('gig_roles') for people and userRole queries", async () => {
      setupGetGigPackMocks({});

      await getGigPack("gig-1", "user-1");

      expect(mockSupabase.from).toHaveBeenNthCalledWith(3, "gig_roles");
      expect(mockSupabase.from).toHaveBeenNthCalledWith(4, "gig_roles");
    });

    it("should handle people being null from query response", async () => {
      setupGetGigPackMocks({ people: null });

      const result = await getGigPack("gig-1", "user-1");

      expect(result.people).toEqual([]);
    });
  });
});
