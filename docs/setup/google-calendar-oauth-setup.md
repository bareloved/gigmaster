# Google Calendar OAuth Setup Guide

**For Calendar Integration Phase 1.5**

This guide explains how to set up Google Calendar OAuth credentials for Ensemble's calendar integration feature.

---

## Overview

Phase 1.5 requires OAuth 2.0 credentials from Google Cloud Console to:
- Connect users' Google Calendars (read-only)
- Import existing calendar events as gigs
- Enable full conflict detection with external calendar events

---

## Prerequisites

- Google account
- Access to [Google Cloud Console](https://console.cloud.google.com/)
- Ensemble app deployed (or running locally with public URL for OAuth callback)

---

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: `Ensemble Calendar Integration`
4. Click "Create"
5. Wait for project creation (may take a few seconds)
6. Ensure the new project is selected in the top dropdown

---

## Step 2: Enable Google Calendar API

1. In the Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Google Calendar API"
3. Click on "Google Calendar API"
4. Click "Enable"
5. Wait for API to be enabled (~30 seconds)

---

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type (unless you have a Google Workspace organization)
3. Click "Create"

### Fill in App Information:

**App information:**
- App name: `Ensemble`
- User support email: Your email
- App logo: (Optional) Upload Ensemble logo

**App domain:**
- Application home page: `https://yourdomain.com`
- Application privacy policy link: `https://yourdomain.com/privacy`
- Application terms of service link: `https://yourdomain.com/terms`

**Developer contact information:**
- Email addresses: Your email

4. Click "Save and Continue"

### Add Scopes:

1. Click "Add or Remove Scopes"
2. Filter by "Google Calendar API"
3. Select these scopes:
   - `https://www.googleapis.com/auth/calendar.readonly` - **Read-only access to calendars**
   - `https://www.googleapis.com/auth/calendar.events.readonly` - **Read-only access to events**
4. Click "Update"
5. Click "Save and Continue"

### Test Users (for development):

1. Click "Add Users"
2. Add your email address and any test user emails
3. Click "Add"
4. Click "Save and Continue"

### Summary:

1. Review the summary
2. Click "Back to Dashboard"

---

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click "Create Credentials" → "OAuth client ID"
3. Select application type: **Web application**
4. Name: `Ensemble Web App`

### Authorized JavaScript origins:

**For local development:**
```
http://localhost:3000
```

**For production:**
```
https://yourdomain.com
```

### Authorized redirect URIs:

**For local development:**
```
http://localhost:3000/api/auth/google-calendar/callback
```

**For production:**
```
https://yourdomain.com/api/auth/google-calendar/callback
```

5. Click "Create"
6. **Save the credentials:**
   - Copy `Client ID` (looks like: `123456789-abc...xyz.apps.googleusercontent.com`)
   - Copy `Client Secret` (looks like: `GOCSPX-abc...xyz`)

---

## Step 5: Add Environment Variables

Add these to your `.env.local` file:

```env
# Google Calendar OAuth
GOOGLE_CALENDAR_CLIENT_ID=your_client_id_here
GOOGLE_CALENDAR_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/auth/google-calendar/callback

# For production, use:
# GOOGLE_CALENDAR_REDIRECT_URI=https://yourdomain.com/api/auth/google-calendar/callback
```

**⚠️ Security:**
- Never commit `.env.local` to git
- Add to `.gitignore` if not already
- Use environment variables in production (Vercel, Railway, etc.)

---

## Step 6: Verify Setup

1. Restart your Next.js development server
2. Sign in to Ensemble
3. Go to Settings → Calendar
4. Click "Connect Google Calendar"
5. You should be redirected to Google OAuth consent screen
6. Grant permissions (read-only)
7. You should be redirected back to Ensemble

If successful, you'll see "Google Calendar Connected" in settings.

---

## Troubleshooting

### "Redirect URI mismatch" error

**Problem:** The redirect URI in your OAuth request doesn't match what's configured in Google Cloud Console.

**Solution:**
1. Go to Google Cloud Console → Credentials
2. Click on your OAuth client ID
3. Verify the redirect URI exactly matches your environment variable
4. Update if needed
5. Restart your app

### "Access blocked: This app's request is invalid"

**Problem:** OAuth consent screen is not properly configured.

**Solution:**
1. Go to Google Cloud Console → OAuth consent screen
2. Ensure app is in "Testing" or "Published" status
3. If in "Testing", add your email as a test user

### "Invalid client" error

**Problem:** Client ID or Client Secret is incorrect.

**Solution:**
1. Verify environment variables match the credentials from Google Cloud Console
2. Ensure no extra spaces or quotes
3. Restart your app after updating

### "Calendar API has not been used in project"

**Problem:** Google Calendar API is not enabled.

**Solution:**
1. Go to Google Cloud Console → APIs & Services → Library
2. Search "Google Calendar API"
3. Click "Enable"

---

## Production Deployment

### Vercel / Netlify / Railway:

1. Add environment variables in platform dashboard:
   ```
   GOOGLE_CALENDAR_CLIENT_ID=your_client_id
   GOOGLE_CALENDAR_CLIENT_SECRET=your_client_secret
   GOOGLE_CALENDAR_REDIRECT_URI=https://yourdomain.com/api/auth/google-calendar/callback
   ```

2. Update Google Cloud Console:
   - Add production domain to "Authorized JavaScript origins"
   - Add production callback URL to "Authorized redirect URIs"

3. Deploy and test

### Publishing Your App:

When ready to move from "Testing" to "Production":

1. Go to OAuth consent screen
2. Click "Publish App"
3. Submit for verification (required for >100 users)
4. Google may take 1-6 weeks to review
5. Until verified, users will see "This app isn't verified" warning (they can still proceed)

---

## Security Best Practices

✅ **Use read-only scopes only**
- Only request `calendar.readonly` and `calendar.events.readonly`
- Never request write access unless absolutely necessary

✅ **Encrypt tokens at rest**
- Store access/refresh tokens encrypted in database
- Use Supabase's built-in encryption or add application-level encryption

✅ **Implement token refresh**
- Refresh tokens before they expire
- Handle expired tokens gracefully

✅ **Allow users to disconnect**
- Provide clear "Disconnect" button in settings
- Delete all stored tokens when user disconnects

✅ **Respect user privacy**
- Only fetch events within reasonable date range (±90 days)
- Don't store unnecessary calendar data
- Clear messaging about what data is accessed

---

## API Rate Limits

Google Calendar API limits:
- **Queries per day:** 1,000,000
- **Queries per 100 seconds per user:** 250
- **Queries per second per user:** 10

**For Ensemble:**
- Typical usage: <10 queries per user per day
- Well within limits for most use cases
- Implement caching to reduce API calls

---

## References

- [Google Calendar API Documentation](https://developers.google.com/calendar/api/guides/overview)
- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google Cloud Console](https://console.cloud.google.com/)
- [API Rate Limits](https://developers.google.com/calendar/api/guides/quota)

---

**Next Steps:** Proceed with Phase 1.5 implementation in Ensemble codebase.

