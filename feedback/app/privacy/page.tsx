import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

/**
 * A factual placeholder (M9 Part M) — never invented company
 * registration, address, or legal promises. Explicitly marked as
 * pending jurisdiction-appropriate legal review before this product
 * takes on real paying customers (`docs/launch-readiness-checklist.md`).
 */
export default function PrivacyPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main id="main-content" className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page describes what data this product collects and how it&rsquo;s
          used. It has not yet received jurisdiction-specific legal review and
          should not be relied on as a complete or final privacy policy.
        </p>

        <div className="mt-8 flex flex-col gap-6 text-sm text-foreground">
          <section>
            <h2 className="font-medium">What we collect</h2>
            <p className="mt-1 text-muted-foreground">
              Workspace accounts: your name and email address, used for
              authentication and to identify your workspace. Public feedback
              boards: a submitter&rsquo;s name and email address, used to
              attribute their request, votes, and comments, and — only when
              they explicitly click &ldquo;Follow updates&rdquo; — to notify
              them about a published changelog entry linked to a request they
              followed. We never infer that consent from submitting, voting,
              or commenting alone.
            </p>
          </section>
          <section>
            <h2 className="font-medium">What we don&rsquo;t do</h2>
            <p className="mt-1 text-muted-foreground">
              We don&rsquo;t sell personal data, and we don&rsquo;t send
              marketing email to a public board participant who hasn&rsquo;t
              explicitly opted in.
            </p>
          </section>
          <section>
            <h2 className="font-medium">Payment information</h2>
            <p className="mt-1 text-muted-foreground">
              Subscription payments are processed by our Shopify store on our
              behalf — we never see or store your full card details.
            </p>
          </section>
          <section>
            <h2 className="font-medium">Questions</h2>
            <p className="mt-1 text-muted-foreground">
              See the <Link href="/contact" className="underline underline-offset-4">Contact</Link> page.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
