'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { acceptInvitation } from '@/lib/api/gig-invitations';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Invalid invitation link - no token provided');
      return;
    }
    
    // Auto-accept on page load
    handleAccept();
  }, [token]);
  
  const handleAccept = async () => {
    if (!token) return;
    
    try {
      await acceptInvitation(token);
      setStatus('success');
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard?view=player');
      }, 2000);
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'Failed to accept invitation');
    }
  };
  
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <div>
                <h3 className="text-lg font-semibold">Processing Invitation</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Please wait while we accept your invitation...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (status === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md w-full border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" />
              <CardTitle>Invitation Error</CardTitle>
            </div>
            <CardDescription>
              We couldn't process your invitation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {error}
            </p>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Possible reasons:
              </p>
              <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                <li>The invitation link has expired (7 days)</li>
                <li>The invitation was already accepted or declined</li>
                <li>You need to log in first</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push('/login')}
                className="flex-1"
              >
                Log In
              </Button>
              <Button
                onClick={() => router.push('/dashboard')}
                className="flex-1"
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="max-w-md w-full border-green-500">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <CardTitle>Invitation Accepted!</CardTitle>
          </div>
          <CardDescription>
            You've successfully joined this gig
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            You can now view gig details, setlist, and other information in your dashboard. 
            Redirecting you now...
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Taking you to your dashboard...</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    }>
      <AcceptInvitationContent />
    </Suspense>
  );
}

