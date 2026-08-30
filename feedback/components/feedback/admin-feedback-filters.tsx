"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { POST_STATUSES, POST_STATUS_LABELS } from "@/lib/feedback/status";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "votes", label: "Most votes" },
  { value: "comments", label: "Most comments" },
] as const;

interface AdminFeedbackFiltersProps {
  query: string;
  status: string;
  sort: string;
}

/**
 * Search/filter/sort, all expressed as URL search params (`q`,
 * `status`, `sort`) — the admin page (a Server Component) reads them
 * and pushes the actual filtering/sorting down to the database
 * (`lib/feedback/data.ts`'s `listOrganizationPostsForAdmin`), never
 * loading the full list into the browser to filter client-side. The
 * search box debounces before navigating; the two selects navigate
 * immediately on change.
 */
export function AdminFeedbackFilters({ query, status, sort }: AdminFeedbackFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(query);
  // Adjusted during render, not in an effect (React's own recommended
  // pattern for "adjusting state when a prop changes"): the input's
  // own state stays in sync with the URL's `q`, so a navigation this
  // component didn't itself trigger (a select change that lands
  // before the search debounce fires, or browser back/forward) never
  // leaves the box showing stale text.
  const [syncedQuery, setSyncedQuery] = useState(query);
  if (query !== syncedQuery) {
    setSyncedQuery(query);
    setSearchValue(query);
  }

  /**
   * Merges `next` onto the *current* URL's params, not the props this
   * component was rendered with — the props reflect whatever the last
   * completed navigation produced, which can be a step behind a
   * navigation still in flight (e.g. the search debounce firing after
   * a select change already pushed a new URL). `useSearchParams()`
   * tracks the live URL, so a later call always merges onto the
   * result of an earlier one instead of reverting it.
   */
  function navigate(next: { q?: string; status?: string; sort?: string }) {
    const merged = {
      q: searchParams.get("q") ?? "",
      status: searchParams.get("status") ?? "",
      sort: searchParams.get("sort") ?? "",
      ...next,
    };
    const params = new URLSearchParams();
    if (merged.q) {
      params.set("q", merged.q);
    }
    if (merged.status && merged.status !== "all") {
      params.set("status", merged.status);
    }
    if (merged.sort && merged.sort !== "newest") {
      params.set("sort", merged.sort);
    }
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchValue !== (searchParams.get("q") ?? "")) {
        navigate({ q: searchValue });
      }
    }, 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search title or description"
          className="pl-8"
          aria-label="Search feedback"
        />
      </div>

      <Select value={status || "all"} onValueChange={(value) => navigate({ status: value ?? "all" })}>
        <SelectTrigger aria-label="Filter by status" className="w-full sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {POST_STATUSES.map((value) => (
            <SelectItem key={value} value={value}>
              {POST_STATUS_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sort || "newest"} onValueChange={(value) => navigate({ sort: value ?? "newest" })}>
        <SelectTrigger aria-label="Sort by" className="w-full sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
