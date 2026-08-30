import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "Terms of Service",
};

/**
 * A factual placeholder (M9 Part M) — never invented company
 * registration, address, or legal promises. Explicitly marked as
 * pending jurisdiction-appropriate legal review before this product
 * takes on real paying customers (`docs/launch-readiness-checklist.md`).
 */
export default function TermsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main id="main-content" className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page describes the basic terms of using this product. It has
          not yet received jurisdiction-specific legal review and should not
          be relied on as a complete or final terms of service.
        </p>

        <div className="mt-8 flex flex-col gap-6 text-sm text-foreground">
          <section>
            <h2 className="font-medium">The service</h2>
            <p className="mt-1 text-muted-foreground">
              A hosted feedback collection, roadmap, and changelog tool for a
              workspace and its customers. The Free plan supports up to 25
              tracked participants; the Pro plan supports up to 100.
              Definitions and current limits are shown on the{" "}
              <Link href="/#pricing" className="underline underline-offset-4">
                pricing section
              </Link>{" "}
              of the home page.
            </p>
          </section>
          <section>
            <h2 className="font-medium">Billing</h2>
            <p className="mt-1 text-muted-foreground">
              Pro subscriptions are billed through our Shopify store. You can
              cancel at any time from your subscription&rsquo;s management
              page; existing data is never deleted for downgrading or
              cancelling.
            </p>
          </section>
          <section>
            <h2 className="font-medium">Acceptable use</h2>
            <p className="mt-1 text-muted-foreground">
              Don&rsquo;t use this product to submit spam, abusive content, or
              content you don&rsquo;t have the right to share.
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
