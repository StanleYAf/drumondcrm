import { Skeleton } from "@/components/ui/skeleton";

function Shimmer({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <Skeleton className={`bg-muted/60 ${className || ""}`} style={style} />;
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Shimmer className="h-8 w-44 rounded-xl" />
          <Shimmer className="h-4 w-28 rounded-lg" />
        </div>
        <div className="flex gap-2">
          <Shimmer className="h-10 w-10 rounded-xl" />
          <Shimmer className="h-10 w-28 rounded-xl" />
        </div>
      </div>

      {/* Hero card */}
      <Shimmer className="h-36 w-full rounded-2xl" />

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-2xl p-5 space-y-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <Shimmer className="h-4 w-20 rounded-lg" />
              <Shimmer className="h-6 w-14 rounded-full" />
            </div>
            <Shimmer className="h-8 w-32 rounded-xl" />
            <Shimmer className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-2xl p-5 bg-muted/30 space-y-4">
        <Shimmer className="h-5 w-40 rounded-lg" />
        <div className="flex items-end gap-2 h-48">
          {[40, 65, 50, 80, 55, 70, 90, 45, 60, 75, 85, 50].map((h, i) => (
            <Shimmer key={i} className="flex-1 rounded-t-lg" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Shimmer className="h-8 w-40 rounded-xl" />
        <Shimmer className="h-10 w-28 rounded-xl" />
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map(i => (
          <Shimmer key={i} className="h-9 w-20 rounded-full" />
        ))}
      </div>

      {/* Summary card */}
      <div className="rounded-2xl p-5 bg-muted/30 space-y-3">
        <div className="flex justify-between">
          <Shimmer className="h-5 w-24 rounded-lg" />
          <Shimmer className="h-5 w-20 rounded-lg" />
        </div>
        <Shimmer className="h-7 w-36 rounded-xl" />
      </div>

      {/* List items */}
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="rounded-xl p-4 bg-muted/30 flex items-center gap-4">
          <Shimmer className="h-10 w-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-4 w-3/4 rounded-lg" />
            <Shimmer className="h-3 w-1/2 rounded-lg" />
          </div>
          <Shimmer className="h-5 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <Shimmer className="h-8 w-40 rounded-xl" />
        <Shimmer className="h-10 w-28 rounded-xl" />
      </div>

      {/* Search bar */}
      <Shimmer className="h-11 w-full rounded-xl" />

      {/* Table header */}
      <div className="rounded-2xl overflow-hidden bg-muted/30">
        <div className="flex gap-4 p-4 border-b border-border/30">
          {[1, 2, 3, 4].map(i => (
            <Shimmer key={i} className="h-4 flex-1 rounded-lg" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 p-4 border-b border-border/10 last:border-0">
            {[1, 2, 3, 4].map(j => (
              <Shimmer key={j} className="h-4 flex-1 rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConfigSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Shimmer className="h-8 w-40 rounded-xl" />

      {/* Profile section */}
      <div className="rounded-2xl bg-muted/30 overflow-hidden">
        <div className="p-4 space-y-1">
          <Shimmer className="h-3 w-32 rounded-lg" />
        </div>
        {[1, 2].map(i => (
          <div key={i} className="flex items-center justify-between p-4 border-t border-border/20">
            <Shimmer className="h-4 w-24 rounded-lg" />
            <Shimmer className="h-4 w-32 rounded-lg" />
          </div>
        ))}
        <div className="p-4 border-t border-border/20">
          <Shimmer className="h-10 w-full rounded-xl" />
        </div>
      </div>

      {/* Users section */}
      <div className="rounded-2xl bg-muted/30 overflow-hidden">
        <div className="p-4 space-y-1">
          <Shimmer className="h-3 w-48 rounded-lg" />
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="p-4 border-t border-border/20 space-y-3">
            <div className="flex items-center gap-3">
              <Shimmer className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Shimmer className="h-4 w-32 rounded-lg" />
                <Shimmer className="h-3 w-24 rounded-lg" />
              </div>
              <Shimmer className="h-7 w-16 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Settings */}
      {[1, 2].map(i => (
        <div key={i} className="rounded-2xl bg-muted/30 overflow-hidden">
          <div className="p-4"><Shimmer className="h-3 w-28 rounded-lg" /></div>
          {[1, 2, 3].map(j => (
            <div key={j} className="flex items-center justify-between p-4 border-t border-border/20">
              <Shimmer className="h-4 w-24 rounded-lg" />
              <Shimmer className="h-4 w-28 rounded-lg" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function FullPageLoading({ message = "Carregando..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-500">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-[3px] border-muted" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
