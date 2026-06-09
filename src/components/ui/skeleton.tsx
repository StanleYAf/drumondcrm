import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/70",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r",
        "before:from-transparent before:via-white/40 before:to-transparent",
        className,
      )}
      {...props}
    />
  );
}

if (typeof document !== "undefined" && !document.getElementById("skeleton-shimmer-kf")) {
  const style = document.createElement("style");
  style.id = "skeleton-shimmer-kf";
  style.textContent = "@keyframes shimmer { 100% { transform: translateX(100%); } }";
  document.head.appendChild(style);
}

export { Skeleton };
