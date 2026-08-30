import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: "Contact",
};

/**
 * Shows a real `mailto:` link only once `CONTACT_EMAIL` is
 * configured — never a fabricated address (M9 Part M).
 */
export default function ContactPage() {
  const { CONTACT_EMAIL } = getEnv();

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
