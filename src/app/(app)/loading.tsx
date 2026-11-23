import { Skeleton } from "@/components/ui/Feedback";

/** Shown while any learner page loads its data. */
export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-48 w-full" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}
