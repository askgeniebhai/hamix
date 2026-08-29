import Link from "next/link";
import { Inbox, ListChecks, Target } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const pillars = [
  {
    icon: Inbox,
    title: "Capture",
    description:
      "Give customers one calm place to tell you what they need — no noise, no clutter.",
  },
  {
    icon: ListChecks,
    title: "Organize",
    description:
      "Similar requests come together automatically, so patterns are visible instead of buried.",
  },
  {
    icon: Target,
    title: "Prioritize",
    description:
      "Direction backed by real customer evidence, not guesswork or personal opinion.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main id="main-content" className="flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-24 sm:py-32">
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl">
            Understand what your customers actually need.
          </h1>
          <p className="max-w-xl text-lg text-pretty text-muted-foreground">
            A calm, focused home for customer feedback — built to turn real
            signals into clear, evidence-backed direction.
          </p>
          <div>
            <Link
              href="/dashboard"
              className={buttonVariants({ size: "lg" })}
            >
              Open workspace
            </Link>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto grid w-full max-w-5xl gap-4 px-6 py-16 sm:grid-cols-3">
            {pillars.map(({ icon: Icon, title, description }) => (
              <Card key={title}>
                <CardHeader>
                  <Icon
                    className="mb-1 size-5 text-primary"
                    aria-hidden="true"
                  />
                  <CardTitle>{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
