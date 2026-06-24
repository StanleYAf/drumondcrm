import { IndicadorCard } from "./IndicadorCard";
import type { IndicadorDef } from "../config/indicadoresConfig";
import type { Totais } from "../hooks/useEngenhariaData";

interface Props {
  indicadores: IndicadorDef[];
  totais: Totais;
}

export function PainelExecutivo({ indicadores, totais }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {indicadores.map((def) => (
        <IndicadorCard
          key={def.id}
          def={def}
          value={totais[def.metric] ?? 0}
          tooltip={`${def.label}: ${def.description}`}
        />
      ))}
    </div>
  );
}