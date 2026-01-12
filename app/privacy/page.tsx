import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPage() {
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
            <CardTitle>Privacy Policy</CardTitle>
            <CardDescription>
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <h2>1. Information We Collect</h2>
            <p>
              We collect information you provide directly to us when you:
            </p>
            <ul>
              <li>Create an account (name, email, instrument)</li>
              <li>Create and manage gigs, projects, and setlists</li>
              <li>Upload files, avatars, and other content</li>
              <li>Communicate with other users through the Service</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>
              We use the information we collect to:
            </p>
            <ul>
              <li>Provide, maintain, and improve the Service</li>
              <li>Send you technical notices and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Send you notifications about gigs, invitations, and payments</li>
            </ul>

            <h2>3. Information Sharing</h2>
            <p>
              We do not sell your personal information. We may share your information:
            </p>
            <ul>
              <li>With other users as necessary for the Service (e.g., other musicians in your gigs)</li>
              <li>With service providers who assist in operating the Service (e.g., hosting, email)</li>
              <li>If required by law or to protect our rights</li>
            </ul>

            <h2>4. Data Storage</h2>
            <p>
              Your data is stored securely using Supabase (a Postgres database service). We implement appropriate security measures to protect your information, including:
            </p>
            <ul>
              <li>Encrypted connections (SSL/TLS)</li>
              <li>Row Level Security (RLS) to ensure users only access their own data</li>
              <li>Regular security updates and monitoring</li>
            </ul>

            <h2>5. Cookies and Tracking</h2>
            <p>
              We use cookies and similar technologies to maintain your session and remember your preferences. You can control cookies through your browser settings.
            </p>

            <h2>6. Your Rights</h2>
            <p>
              You have the right to:
            </p>
            <ul>
              <li>Access your personal information</li>
              <li>Correct inaccurate information</li>
              <li>Delete your account and associated data</li>
              <li>Export your data</li>
            </ul>

            <h2>7. Third-Party Services</h2>
            <p>
              We use third-party services for authentication (Google OAuth), storage, and hosting. These services have their own privacy policies:
            </p>
            <ul>
              <li><a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Supabase Privacy Policy</a></li>
              <li><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Privacy Policy</a></li>
              <li><a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Vercel Privacy Policy</a></li>
            </ul>

            <h2>8. Children&apos;s Privacy</h2>
            <p>
              The Service is not intended for users under 13 years of age. We do not knowingly collect information from children under 13.
            </p>

            <h2>9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
            </p>

            <h2>10. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us through the Service.
            </p>

            <div className="mt-8 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> This is a placeholder privacy policy. Please consult with a legal professional to create a proper Privacy Policy that complies with applicable laws (GDPR, CCPA, etc.) in your jurisdiction.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

