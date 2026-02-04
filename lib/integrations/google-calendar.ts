import "server-only";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

/**
 * Google Calendar API Client
 *
 * Wrapper for Google Calendar API operations:
 * - OAuth authorization
 * - Token refresh
 * - Fetch calendar events
 * - Create/update events with attendees
 * - Webhook registration for response sync
 */

/**
 * OAuth scopes for read-only access (current)
 */
export const GOOGLE_CALENDAR_READ_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events.readonly",
];

/**
 * OAuth scopes for write access (calendar invitations)
 */
export const GOOGLE_CALENDAR_WRITE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  htmlLink: string;
  status: string;
  organizer?: {
    email: string;
    displayName?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: 'accepted' | 'declined' | 'tentative' | 'needsAction';
    organizer?: boolean;
    self?: boolean;
  }>;
}

export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number; // Unix timestamp in ms
}

export interface CreateEventInput {
  summary: string;
  description: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees: Array<{
    email: string;
    displayName?: string;
  }>;
}

export interface WatchResponse {
  channelId: string;
  resourceId: string;
  expiration: number;
}

// Google Calendar API types from googleapis
type GoogleCalendarAPI = ReturnType<typeof google.calendar>;

export class GoogleCalendarClient {
  private oauth2Client: OAuth2Client;
  private calendar: GoogleCalendarAPI;

  constructor() {
    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error(
        "Missing Google Calendar OAuth credentials. Please set GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET, and GOOGLE_CALENDAR_REDIRECT_URI environment variables."
      );
    }

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    this.calendar = google.calendar({ version: "v3", auth: this.oauth2Client });
  }

  /**
   * Generate authorization URL for OAuth flow
   * @param writeAccess - If true, request write permissions for creating events
   */
  getAuthorizationUrl(writeAccess: boolean = false): string {
    const scopes = writeAccess
      ? GOOGLE_CALENDAR_WRITE_SCOPES
      : GOOGLE_CALENDAR_READ_SCOPES;

    return this.oauth2Client.generateAuthUrl({
      access_type: "offline", // Request refresh token
      scope: scopes,
      prompt: "consent", // Force consent screen to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async authorize(authCode: string): Promise<GoogleTokens> {
    try {
      const { tokens } = await this.oauth2Client.getToken(authCode);
      
      if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date) {
        throw new Error("Incomplete tokens received from Google");
      }

      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to authorize with Google: ${message}`);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();

      if (!credentials.access_token || !credentials.expiry_date) {
        throw new Error("Failed to refresh access token");
      }

      return {
        access_token: credentials.access_token,
        refresh_token: refreshToken, // Refresh token stays the same
        expiry_date: credentials.expiry_date,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to refresh token: ${message}`);
    }
  }

  /**
   * Set credentials for authenticated requests
   */
  setCredentials(tokens: GoogleTokens) {
    this.oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    });
  }

  /**
   * List calendar events within a date range
   */
  async listEvents(
    from: Date,
    to: Date,
    maxResults: number = 100
  ): Promise<GoogleCalendarEvent[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId: "primary",
        timeMin: from.toISOString(),
        timeMax: to.toISOString(),
        maxResults,
        singleEvents: true, // Expand recurring events
        orderBy: "startTime",
      });

      const events = response.data.items || [];

      return events.map((event): GoogleCalendarEvent => ({
        id: event.id || '',
        summary: event.summary || "Untitled Event",
        description: event.description || undefined,
        location: event.location || undefined,
        start: {
          dateTime: event.start?.dateTime || undefined,
          date: event.start?.date || undefined,
          timeZone: event.start?.timeZone || undefined,
        },
        end: {
          dateTime: event.end?.dateTime || undefined,
          date: event.end?.date || undefined,
          timeZone: event.end?.timeZone || undefined,
        },
        htmlLink: event.htmlLink || '',
        status: event.status || '',
        organizer: event.organizer ? {
          email: event.organizer.email || '',
          displayName: event.organizer.displayName || undefined,
        } : undefined,
        attendees: event.attendees?.map((attendee) => ({
          email: attendee.email || '',
          displayName: attendee.displayName || undefined,
          responseStatus: attendee.responseStatus as 'accepted' | 'declined' | 'tentative' | 'needsAction' | undefined,
          organizer: attendee.organizer || undefined,
          self: attendee.self || undefined,
        })),
      }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to list calendar events: ${message}`);
    }
  }

  /**
   * Get a single calendar event
   */
  async getEvent(eventId: string): Promise<GoogleCalendarEvent> {
    try {
      const response = await this.calendar.events.get({
        calendarId: "primary",
        eventId,
      });

      const event = response.data;

      return {
        id: event.id || '',
        summary: event.summary || "Untitled Event",
        description: event.description || undefined,
        location: event.location || undefined,
        start: {
          dateTime: event.start?.dateTime || undefined,
          date: event.start?.date || undefined,
          timeZone: event.start?.timeZone || undefined,
        },
        end: {
          dateTime: event.end?.dateTime || undefined,
          date: event.end?.date || undefined,
          timeZone: event.end?.timeZone || undefined,
        },
        htmlLink: event.htmlLink || '',
        status: event.status || '',
        organizer: event.organizer ? {
          email: event.organizer.email || '',
          displayName: event.organizer.displayName || undefined,
        } : undefined,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get calendar event: ${message}`);
    }
  }

  /**
   * Create a calendar event with attendees
   */
  async createEvent(input: CreateEventInput): Promise<GoogleCalendarEvent> {
    try {
      const response = await this.calendar.events.insert({
        calendarId: "primary",
        requestBody: {
          summary: input.summary,
          description: input.description,
          location: input.location,
          start: input.start,
          end: input.end,
          attendees: input.attendees.map(a => ({
            email: a.email,
            displayName: a.displayName,
          })),
          reminders: {
            useDefault: true,
          },
        },
        sendUpdates: "all", // Send invitations to attendees
      });

      const event = response.data;
      return {
        id: event.id || '',
        summary: event.summary || '',
        description: event.description || undefined,
        location: event.location || undefined,
        start: {
          dateTime: event.start?.dateTime || undefined,
          date: event.start?.date || undefined,
          timeZone: event.start?.timeZone || undefined,
        },
        end: {
          dateTime: event.end?.dateTime || undefined,
          date: event.end?.date || undefined,
          timeZone: event.end?.timeZone || undefined,
        },
        htmlLink: event.htmlLink || '',
        status: event.status || '',
        attendees: event.attendees?.map(a => ({
          email: a.email || '',
          displayName: a.displayName || undefined,
          responseStatus: a.responseStatus as 'accepted' | 'declined' | 'tentative' | 'needsAction' | undefined,
        })),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to create calendar event: ${message}`);
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateEvent(eventId: string, input: Partial<CreateEventInput>): Promise<GoogleCalendarEvent> {
    try {
      const response = await this.calendar.events.patch({
        calendarId: "primary",
        eventId,
        requestBody: {
          summary: input.summary,
          description: input.description,
          location: input.location,
          start: input.start,
          end: input.end,
        },
        sendUpdates: "all",
      });

      const event = response.data;
      return {
        id: event.id || '',
        summary: event.summary || '',
        description: event.description || undefined,
        location: event.location || undefined,
        start: {
          dateTime: event.start?.dateTime || undefined,
          date: event.start?.date || undefined,
          timeZone: event.start?.timeZone || undefined,
        },
        end: {
          dateTime: event.end?.dateTime || undefined,
          date: event.end?.date || undefined,
          timeZone: event.end?.timeZone || undefined,
        },
        htmlLink: event.htmlLink || '',
        status: event.status || '',
        attendees: event.attendees?.map(a => ({
          email: a.email || '',
          displayName: a.displayName || undefined,
          responseStatus: a.responseStatus as 'accepted' | 'declined' | 'tentative' | 'needsAction' | undefined,
        })),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to update calendar event: ${message}`);
    }
  }

  /**
   * Watch a calendar event for changes (webhook registration)
   */
  async watchEvent(eventId: string, webhookUrl: string): Promise<WatchResponse> {
    try {
      // Generate unique channel ID
      const channelId = `gigmaster-${eventId}-${Date.now()}`;

      const response = await this.calendar.events.watch({
        calendarId: "primary",
        requestBody: {
          id: channelId,
          type: "web_hook",
          address: webhookUrl,
          params: {
            ttl: "604800", // 7 days in seconds
          },
        },
      });

      return {
        channelId: response.data.id || channelId,
        resourceId: response.data.resourceId || '',
        expiration: parseInt(response.data.expiration || '0', 10),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to watch calendar event: ${message}`);
    }
  }

  /**
   * Stop watching a calendar event
   */
  async stopWatch(channelId: string, resourceId: string): Promise<void> {
    try {
      await this.calendar.channels.stop({
        requestBody: {
          id: channelId,
          resourceId,
        },
      });
    } catch (error: unknown) {
      // Ignore errors when stopping watches - channel may have expired
      console.warn(`Failed to stop watch ${channelId}:`, error);
    }
  }
}

/**
 * Helper function to parse Google Calendar date/time to standard format
 */
export function parseGoogleDateTime(
  dateTime?: string,
  date?: string
): {
  date: string;
  time: string | null;
} {
  if (dateTime) {
    // Full date-time
    const dt = new Date(dateTime);
    const dateStr = dt.toISOString().split("T")[0]; // YYYY-MM-DD
    const timeStr = dt.toTimeString().split(" ")[0].substring(0, 5); // HH:MM
    return { date: dateStr, time: timeStr };
  } else if (date) {
    // All-day event
    return { date, time: null };
  } else {
    throw new Error("Invalid Google Calendar event: missing date/time");
  }
}

