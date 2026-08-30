import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "Contact",
};

/**
 * Shows a real `mailto:` link only once `CONTACT_EMAIL` is
 * configured — never a fabricated address (M9 Part M).
 *
 * Reads `process.env.CONTACT_EMAIL` directly rather than through
 * `getEnv()`: this route is static (prerendered at build time, with
 * no live environment), and `getEnv()` validates the *entire* schema
 * — including `DATABASE_URL`/`BETTER_AUTH_SECRET`, which this page
 * has nothing to do with — so a zero-env production build (CI's own
 * Tier 2 job included, which never sets those) crashed prerendering
 * this exact page. Bypassing the shared validator for this one
 * optional, display-only field keeps the zero-env-safe guarantee
 * intact without weakening validation for every route that actually
 * needs a database or an auth secret.
 */
export default function ContactPage() {
  const CONTACT_EMAIL = process.env.CONTACT_EMAIL;

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main id="main-content" className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Contact</h1>
        {CONTACT_EMAIL ? (
          <p className="mt-4 text-sm text-foreground">
            Questions about the product, billing, or your data? Email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            A contact address hasn&rsquo;t been configured for this environment yet.
          </p>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
