# Environment Variables for Vercel Deployment

This document lists all environment variables needed for the Ensemble app to run in production on Vercel.

## Required Variables (App Will Not Work Without These)

### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Where to find these:**
1. Go to your Supabase project dashboard
2. Click on "Settings" > "API"
3. Copy the "Project URL" and "anon public" key
4. Copy the "service_role" key (⚠️ Keep this secret! Only for server-side use)

**Note:** The `SUPABASE_SERVICE_ROLE_KEY` is required for:
- Public GigPack sharing (bypasses RLS to show gigs to anyone with a share link)
- Server-side operations that need admin access

## Optional Variables (Features Will Be Disabled Without These)

### Google Calendar Integration
```
GOOGLE_CALENDAR_CLIENT_ID=your-google-client-id
GOOGLE_CALENDAR_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALENDAR_REDIRECT_URI=https://your-app.vercel.app/api/auth/google-calendar/callback
```

**Note:** If these are not set, the Google Calendar integration features will not work, but the rest of the app will function normally.

**Where to get these:**
1. Go to Google Cloud Console
2. Create OAuth 2.0 credentials
3. Set redirect URI to match your Vercel deployment URL

### Email Notifications (Resend)
```
RESEND_API_KEY=re_your_resend_api_key
```

**Note:** If not set, email invitations will not be sent, but the app will still work.

**Where to get this:**
1. Sign up at https://resend.com
2. Create an API key in your dashboard

### Google Maps (Venue Autocomplete)
```
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=your-google-maps-api-key
```

**Note:** If not set, the venue autocomplete will fall back to a standard text input.

**Where to get this:**
1. Go to Google Cloud Console
2. Enable "Maps JavaScript API" and "Places API"
3. Create an API key and restrict it to your domain for security.

### Application URL
```
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**Note:** Used for generating invitation links. Falls back to localhost in development.

## How to Add to Vercel

1. Go to your Vercel project dashboard
2. Click on "Settings" > "Environment Variables"
3. Add each variable one by one
4. Make sure to select the appropriate environments (Production, Preview, Development)
5. Click "Save"

## Verification Checklist

Before deploying, make sure:
- [ ] NEXT_PUBLIC_SUPABASE_URL is set
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY is set
- [ ] GOOGLE_CALENDAR_* variables are set (if using calendar integration)
- [ ] RESEND_API_KEY is set (if using email invitations)
- [ ] NEXT_PUBLIC_APP_URL is set to your production URL
- [ ] All variables are set for "Production" environment
- [ ] No secrets are committed to git

## Security Notes

- Never commit `.env.local` or `.env` files to git
- The `NEXT_PUBLIC_*` variables are exposed to the browser - don't put secrets there
- Keep your Resend API key and Google client secret secure
- Rotate keys regularly for security

