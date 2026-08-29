import Link from "next/link";
import { Compass } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main-content" className="flex flex-1 flex-col p-6 sm:p-10">
      <EmptyState
        icon={Compass}
        headingLevel="h1"
        title="Page not found"
        description="The page you're looking for doesn't exist or has moved."
        action={
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Back to home
          </Link>
        }
      />
    </main>
  );
}
