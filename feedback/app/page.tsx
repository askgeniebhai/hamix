import Link from "next/link";
import { Check, Inbox, Milestone, ScrollText } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { PRO_PLAN_DISPLAY_PRICE_USD, PLAN_TRACKED_PARTICIPANT_LIMIT } from "@/lib/billing/plans";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const loop = [
  {
    icon: Inbox,
    title: "Feedback",
    description:
      "Customers tell you what they need on one calm public board — no login required to browse or submit.",
  },
  {
    icon: Milestone,
    title: "Roadmap",
    description:
      "What's planned, in progress, and shipped is visible to every customer, drawn straight from real requests.",
  },
  {
    icon: ScrollText,
    title: "Changelog",
    description:
      "Publish what shipped, linked back to the request that asked for it, and the customers who followed it are notified.",
  },
];

const freeFeatures = [
  "Feedback, voting, and comments",
  "Public roadmap and changelog",
  "Up to 25 tracked participants",
];

const proFeatures = [
  "Everything in Free",
  `Up to ${PLAN_TRACKED_PARTICIPANT_LIMIT.pro} tracked participants`,
  "Priced to fit a small, growing team",
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main id="main-content" className="flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-24 sm:py-32">
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl">
            Turn feedback into what you build next.
          </h1>
          <p className="max-w-xl text-lg text-pretty text-muted-foreground">
            One calm place for customers to tell you what they need, see what&rsquo;s
            planned, and hear when it ships — so nothing gets lost and nobody has
            to ask twice.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/signup" className={buttonVariants({ size: "lg" })}>
              Start Free
            </Link>
            <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Login
            </Link>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto grid w-full max-w-5xl gap-4 px-6 py-16 sm:grid-cols-3">
            {loop.map(({ icon: Icon, title, description }) => (
              <Card key={title}>
                <CardHeader>
                  <Icon className="mb-1 size-5 text-primary" aria-hidden="true" />
                  <CardTitle as="h2">{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section id="pricing" className="border-t border-border">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-16">
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Simple pricing
              </h2>
              <p className="text-sm text-muted-foreground">
                Start free. Upgrade when you outgrow it.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle as="h3" className="text-base">Free</CardTitle>
                  <CardDescription>For getting started.</CardDescription>
                  <p className="pt-1 text-2xl font-semibold text-foreground">$0</p>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <ul className="flex flex-col gap-2 text-sm text-foreground">
                    {freeFeatures.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href="/signup" className={cn(buttonVariants({ variant: "outline" }), "w-fit")}>
                    Start Free
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-primary/40">
                <CardHeader>
                  <CardTitle as="h3" className="text-base">Pro</CardTitle>
                  <CardDescription>For a growing customer base.</CardDescription>
                  <p className="pt-1 text-2xl font-semibold text-foreground">
                    ${PRO_PLAN_DISPLAY_PRICE_USD}
                    <span className="text-sm font-normal text-muted-foreground">/month</span>
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <ul className="flex flex-col gap-2 text-sm text-foreground">
                    {proFeatures.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href="/signup" className={cn(buttonVariants(), "w-fit")}>
                    Start Free
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
