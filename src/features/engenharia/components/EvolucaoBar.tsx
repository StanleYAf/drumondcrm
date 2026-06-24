import { cn } from "@/lib/utils";

interface Props {
  value: number;
  /** 0-100 */
  tone?: "success" | "warning" | "danger" | "primary";
  height?: "sm" | "md" | "lg";
  showLabel?: boolean;
  label?: string;
}

const TONE_BAR: Record<NonNullable<Props["tone"]>, string> = {
  success: "from-emerald-500/80 to-emerald-500",
  warning: "from-amber-500/80 to-amber-500",
  danger:  "from-red-500/80 to-red-500",
  primary: "from-primary/80 to-primary",
};
const H: Record<NonNullable<Props["height"]>, string> = {
  sm: "h-1.5", md: "h-2.5", lg: "h-4",
};

export function EvolucaoBar({ value, tone = "primary", height = "md", showLabel = false, label }: Props) {
  const v = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div className="w-full space-y-1">
      {showLabel && (
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>{label ?? "Progresso"}</span>
          <span className="tabular-nums">{v.toFixed(1)}%</span>
        </div>
      )}
      <div className={cn("w-full rounded-full bg-secondary/60 overflow-hidden", H[height])}>
        <div
          className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700", TONE_BAR[tone])}
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}