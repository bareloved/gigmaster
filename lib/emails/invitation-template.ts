/**
 * Email Templates for Gig Invitations
 * 
 * Simple text-based email templates for inviting musicians to gigs
 */

export interface InvitationEmailData {
  inviteLink: string;
  gigTitle: string;
  hostName?: string | null;
  roleName: string;
  gigDate: string;
  gigTime?: string;
  locationName?: string;
}

/**
 * Build invitation email subject and body
 */
export function buildInvitationEmail(data: InvitationEmailData): {
  subject: string;
  text: string;
} {
  const {
    inviteLink,
    gigTitle,
    hostName,
    roleName,
    gigDate,
    gigTime,
    locationName,
  } = data;

  // Format date nicely
  const formattedDate = new Date(gigDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Build subject
  const subject = `Gig Invitation: ${roleName} for ${gigTitle}`;

  // Build text body
  const text = `
Hi there!

You've been invited to play on an upcoming gig!

GIG DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Host: ${hostName || '—'}
Gig: ${gigTitle}
Role: ${roleName}
Date: ${formattedDate}${gigTime ? `\nTime: ${gigTime}` : ''}${locationName ? `\nLocation: ${locationName}` : ''}

ACCEPT OR DECLINE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Click the link below to accept or decline this invitation:

${inviteLink}

This link will expire in 7 days.

Questions? Reply to this email or contact the project manager directly.

Best,
The GigMaster Team
  `.trim();

  return { subject, text };
}

