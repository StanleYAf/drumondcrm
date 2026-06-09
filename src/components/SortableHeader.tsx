import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface SortableHeaderProps<T extends string> {
  field: T;
  activeField: T | null;
  direction: "asc" | "desc";
  onSort: (field: T) => void;
  children: React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}

export function SortableHeader<T extends string>({
  field,
  activeField,
  direction,
  onSort,
  children,
  className,
  align = "left",
}: SortableHeaderProps<T>) {
  const active = activeField === field;
  const Icon = !active ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead className={cn("select-none", className)}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide transition-colors hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
          align === "right" && "ml-auto flex-row-reverse",
          align === "center" && "mx-auto",
        )}
      >
        {children}
        <Icon className={cn("h-3.5 w-3.5", active ? "opacity-100" : "opacity-50")} />
      </button>
    </TableHead>
  );
}