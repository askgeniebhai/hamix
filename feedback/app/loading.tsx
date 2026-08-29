import { Skeleton } from "@/components/ui/skeleton";

export default function RootLoading() {
  return (
    <main
      id="main-content"
      className="flex flex-1 flex-col gap-6 p-6 sm:p-10"
      aria-busy="true"
    >
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-4 w-full max-w-md" />
      <Skeleton className="h-4 w-full max-w-sm" />
    </main>
  );
}
