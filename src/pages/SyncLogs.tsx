import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type SyncLog = {
  id: string;
  created_at: string;
  cliente_id: string | null;
  mes: string | null;
  ano: number | null;
  total_os: number;
  total_indicadores: number;
  total_tecnicos: number;
  status: string;
  mensagem: string | null;
};

type Cliente = { id: string; nome: string };

export default function SyncLogs() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroCliente, setFiltroCliente] = useState<string>("todos");
  const [filtroMes, setFiltroMes] = useState<string>("");

  useEffect(() => {
    (async () => {
      const [{ data: l }, { data: c }] = await Promise.all([
        supabase.from("sync_logs").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("clientes").select("id, nome").order("nome"),
      ]);
      setLogs((l as SyncLog[]) ?? []);
      setClientes((c as Cliente[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const clienteMap = useMemo(() => {
    const m = new Map<string, string>();
    clientes.forEach(c => m.set(c.id, c.nome));
    return m;
  }, [clientes]);

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (filtroCliente !== "todos") {
        if (filtroCliente === "null") {
          if (l.cliente_id) return false;
        } else if (l.cliente_id !== filtroCliente) return false;
      }
      if (filtroMes) {
        const target = `${l.ano ?? ""}-${l.mes ?? ""}`.toLowerCase();
        if (!target.includes(filtroMes.toLowerCase())) return false;
      }
      return true;
    });
  }, [logs, filtroCliente, filtroMes]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Logs de Sincronização</h1>
        <p className="text-sm text-muted-foreground">Histórico das execuções do RPA</p>
      </div>

      <Card className="p-4 flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">Cliente</label>
          <Select value={filtroCliente} onValueChange={setFiltroCliente}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os clientes</SelectItem>
              <SelectItem value="null">Sem cliente (global)</SelectItem>
              {clientes.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">Mês/Ano (ex: 2025-Janeiro)</label>
          <Input
            placeholder="Filtrar por mês ou ano..."
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
          />
        </div>
      </Card>

      {/* Card list - portrait / narrow */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          <Card className="p-6 text-center text-muted-foreground">Carregando...</Card>
        ) : filtered.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">Nenhum log encontrado</Card>
        ) : filtered.map(log => (
          <Card key={log.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">
                  {log.cliente_id ? (clienteMap.get(log.cliente_id) ?? "—") : <span className="text-muted-foreground italic">Global</span>}
                </div>
                <div className="text-xs text-muted-foreground tabular-nums">{formatDate(log.created_at)}</div>
              </div>
              <Badge variant={log.status === "sucesso" ? "default" : "destructive"} className="shrink-0">
                {log.status}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {log.mes && log.ano ? `${log.mes}/${log.ano}` : "—"}
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">OS</div>
                <div className="text-base font-semibold tabular-nums">{log.total_os}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Indicad.</div>
                <div className="text-base font-semibold tabular-nums">{log.total_indicadores}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Técnicos</div>
                <div className="text-base font-semibold tabular-nums">{log.total_tecnicos}</div>
              </div>
            </div>
            {log.mensagem && (
              <div className="text-xs text-muted-foreground pt-2 border-t border-border break-words">
                {log.mensagem}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Table - landscape / wide */}
      <Card className="overflow-x-auto hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Mês/Ano</TableHead>
              <TableHead className="text-right">OS</TableHead>
              <TableHead className="text-right">Indicadores</TableHead>
              <TableHead className="text-right">Técnicos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Mensagem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum log encontrado</TableCell></TableRow>
            ) : filtered.map(log => (
              <TableRow key={log.id}>
                <TableCell className="tabular-nums whitespace-nowrap">{formatDate(log.created_at)}</TableCell>
                <TableCell>{log.cliente_id ? (clienteMap.get(log.cliente_id) ?? "—") : <span className="text-muted-foreground italic">Global</span>}</TableCell>
                <TableCell className="whitespace-nowrap">{log.mes && log.ano ? `${log.mes}/${log.ano}` : "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{log.total_os}</TableCell>
                <TableCell className="text-right tabular-nums">{log.total_indicadores}</TableCell>
                <TableCell className="text-right tabular-nums">{log.total_tecnicos}</TableCell>
                <TableCell>
                  <Badge variant={log.status === "sucesso" ? "default" : "destructive"}>
                    {log.status}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-xs truncate text-xs text-muted-foreground" title={log.mensagem ?? ""}>
                  {log.mensagem ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}