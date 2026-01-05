import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl py-8">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">
              ← Back
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Terms of Service</CardTitle>
            <CardDescription>
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using Ensemble ("the Service"), you accept and agree to be bound by the terms and provision of this agreement.
            </p>

            <h2>2. Description of Service</h2>
            <p>
              Ensemble is a gig management platform designed for musicians, band leaders, and music agencies to organize gigs, manage lineups, track payments, and coordinate musical materials.
            </p>

            <h2>3. User Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
            </p>

            <h2>4. User Data</h2>
            <p>
              You retain all rights to any data you submit, post or display on or through the Service. By using the Service, you grant us permission to use your data solely for the purpose of providing and improving the Service.
            </p>

            <h2>5. Privacy</h2>
            <p>
              Your use of the Service is also governed by our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
            </p>

            <h2>6. Prohibited Uses</h2>
            <p>
              You may not use the Service for any illegal purposes or to violate any laws in your jurisdiction. You may not attempt to gain unauthorized access to any portion of the Service.
            </p>

            <h2>7. Limitation of Liability</h2>
            <p>
              The Service is provided "as is" without warranties of any kind. In no event shall Ensemble be liable for any damages arising out of the use or inability to use the Service.
            </p>

            <h2>8. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. We will notify users of any material changes via email or through the Service.
            </p>

            <h2>9. Contact</h2>
            <p>
              If you have any questions about these Terms, please contact us through the Service.
            </p>

            <div className="mt-8 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> These are placeholder terms. Please consult with a legal professional to create proper Terms of Service for your jurisdiction and use case.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

