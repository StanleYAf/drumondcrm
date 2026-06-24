import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TONE_CLASSES, type IndicadorDef } from "../config/indicadoresConfig";
import { resolveIcon } from "../config/iconRegistry";
import { cn } from "@/lib/utils";

interface Props {
  def: IndicadorDef;
  value: number | string;
  tooltip?: string;
}

export function IndicadorCard({ def, value, tooltip }: Props) {
  const tone = TONE_CLASSES[def.tone];
  const Icon = resolveIcon(def.icon);

  const body = (
    <Card
      className={cn(
        "group relative overflow-hidden border transition-all",
        "hover:shadow-lg hover:-translate-y-0.5",
        tone.border, tone.bg,
      )}
    >
      <div className="p-4 flex items-start gap-3">
        <div className={cn("h-10 w-10 rounded-lg grid place-items-center bg-background/60 ring-1", tone.ring)}>
          <Icon className={cn("h-5 w-5", tone.icon)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground truncate">
            {def.label}
          </div>
          <div className={cn("text-2xl font-semibold leading-tight tabular-nums", tone.text)}>
            {value}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">{def.description}</div>
        </div>
      </div>
    </Card>
  );

  const wrapped = def.href ? (
    <Link to={def.href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg">
      {body}
    </Link>
  ) : body;

  if (!tooltip) return wrapped;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{wrapped}</TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}