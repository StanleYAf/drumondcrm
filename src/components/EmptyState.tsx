import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[35vh] p-8 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="w-16 h-16 rounded-2xl bg-muted/80 flex items-center justify-center mb-5">
        <Icon className="h-8 w-8 text-muted-foreground/70" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-95"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
