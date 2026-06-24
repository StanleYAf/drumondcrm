import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";
import type { Filtros } from "../hooks/useEngenhariaData";

interface Props {
  filtros: Filtros;
  onChange: (next: Partial<Filtros>) => void;
  onReset: () => void;
  clientes: { id: string; nome: string }[];
  tecnicos: string[];
  periodos: { mes: string; ano: number }[];
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);
const ALL = "__all__";

export function FiltrosGlobais({ filtros, onChange, onReset, clientes, tecnicos, periodos }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-border bg-card/50">
      <div className="flex items-center gap-2 text-xs text-muted-foreground pr-1">
        <Filter className="h-3.5 w-3.5" /> Filtros
      </div>

      <Select
        value={filtros.mes && filtros.ano ? `${filtros.ano}-${filtros.mes}` : ALL}
        onValueChange={(v) => {
          if (v === ALL) { onChange({ mes: undefined, ano: undefined }); return; }
          const [ano, ...rest] = v.split("-");
          onChange({ ano: Number(ano), mes: rest.join("-") });
        }}
      >
        <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Período" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Período mais recente</SelectItem>
          {periodos.map((p) => (
            <SelectItem key={`${p.ano}-${p.mes}`} value={`${p.ano}-${p.mes}`}>
              {cap(p.mes)} / {p.ano}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filtros.clienteId ?? ALL}
        onValueChange={(v) => onChange({ clienteId: v === ALL ? undefined : v })}
      >
        <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Cliente" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos os clientes</SelectItem>
          {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select
        value={filtros.tecnico ?? ALL}
        onValueChange={(v) => onChange({ tecnico: v === ALL ? undefined : v })}
      >
        <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Técnico" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos os técnicos</SelectItem>
          {tecnicos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select
        value={filtros.tipo ?? "todas"}
        onValueChange={(v) => onChange({ tipo: v as Filtros["tipo"] })}
      >
        <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Tipo de O.S." /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todos os tipos</SelectItem>
          <SelectItem value="preventiva">Preventivas</SelectItem>
          <SelectItem value="corretiva">Corretivas</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filtros.status ?? "todas"}
        onValueChange={(v) => onChange({ status: v as Filtros["status"] })}
      >
        <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todos os status</SelectItem>
          <SelectItem value="abertas">Abertas</SelectItem>
          <SelectItem value="fechadas">Fechadas</SelectItem>
        </SelectContent>
      </Select>

      <Button variant="ghost" size="sm" onClick={onReset} className="gap-1 ml-auto">
        <X className="h-3.5 w-3.5" /> Limpar
      </Button>
    </div>
  );
}