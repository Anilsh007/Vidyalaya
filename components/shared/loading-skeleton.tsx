import { cn } from "@/lib/utils";

export function Skeleton({
  className
}: {
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%]",
        className
      )}
    />
  );
}

export function LoadingPage({
  heroClassName,
  panelCount = 2,
  panelClassName = "h-80"
}: {
  heroClassName?: string;
  panelCount?: number;
  panelClassName?: string;
}) {
  return (
    <div className="grid gap-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel sm:p-6">
        <Skeleton className={cn("h-4 w-24", heroClassName)} />
        <Skeleton className="mt-4 h-10 w-full max-w-xl" />
        <Skeleton className="mt-3 h-4 w-full max-w-3xl" />
        <Skeleton className="mt-2 h-4 w-full max-w-2xl" />
      </div>

      <div className={cn("grid gap-6", panelCount > 1 ? "xl:grid-cols-2" : undefined)}>
        {Array.from({ length: panelCount }).map((_, index) => (
          <div
            key={index}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel sm:p-6"
          >
            <Skeleton className="h-5 w-36" />
            <Skeleton className="mt-3 h-4 w-3/4" />
            <Skeleton className={cn("mt-6 w-full", panelClassName)} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function LoadingSkeleton({
  title,
  rows = 6
}: {
  title?: string;
  rows?: number;
}) {
  return (
    <div className="grid gap-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel sm:p-6">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-4 h-8 w-full max-w-md" />
        {title ? <p className="mt-4 text-sm text-slate-500">{title}</p> : null}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel sm:p-6">
        <div className="grid gap-3">
          {Array.from({ length: rows }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
