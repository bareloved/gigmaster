/**
 * Send Invitation Email API Route
 * 
 * Handles sending invitation emails via Resend
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { buildInvitationEmail } from '@/lib/emails/invitation-template';

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    const {
      to,
      inviteLink,
      gigTitle,
      projectName,
      roleName,
      gigDate,
      gigTime,
      locationName,
    } = body;

    // Validate required fields
    if (!to || !inviteLink || !gigTitle || !projectName || !roleName || !gigDate) {
      console.error('Missing required fields:', { to, inviteLink, gigTitle, projectName, roleName, gigDate });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Build email content
    const { subject, text } = buildInvitationEmail({
      inviteLink,
      gigTitle,
      projectName,
      roleName,
      gigDate,
      gigTime,
      locationName,
    });

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: 'Ensemble <onboarding@resend.dev>', // Test mode sender
      to: [to],
      subject,
      text,
    });

    if (error) {
      console.error('Resend error:', {
        error,
        message: error.message,
        name: error.name,
      });
      return NextResponse.json(
        { error: 'Failed to send email', details: error },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, emailId: data?.id },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sending invitation email:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

