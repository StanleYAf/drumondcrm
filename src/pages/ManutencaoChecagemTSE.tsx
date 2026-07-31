import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import { ShieldAlert, Download, CheckCircle2 } from "lucide-react";

type Equip = {
  id: string;
  cliente_id: string;
  equipamento: string;
  localizacao: string | null;
  unidade: string | null;
  setor: string | null;
  ativo: boolean;
};

type Plano = {
  equipamento_id: string;
  ano: number;
  mes: number;
  tipo_servico: string;
  status: string;
};

type Linha = {
  key: string;
  equipamento: string;
  clienteNome: string;
  localizacao: string;
  unidade: string;
  setor: string;
  situacao: "vencido" | "nunca";
  refMes?: number;
  refAno?: number;
  ultimaExec: string;
};

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const fmtMes = (m?: number, a?: number) => (m && a ? `${MESES[m - 1]}/${a}` : "—");

export default function ManutencaoChecagemTSE() {
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equip[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [clienteSel, setClienteSel] = useState<string>("todos");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [cRes, eRes, pRes] = await Promise.all([
        supabase.from("clientes").select("id, nome").order("nome"),
        supabase.from("cronograma_equipamentos").select("id, cliente_id, equipamento, localizacao, unidade, setor, ativo").eq("ativo", true),
        supabase.from("cronograma_planejamento").select("equipamento_id, ano, mes, tipo_servico, status"),
      ]);
      setClientes((cRes.data as any[]) || []);
      setEquipamentos((eRes.data as any[]) || []);
      setPlanos((pRes.data as any[]) || []);
      setLoading(false);
    })();
  }, []);

  const { tse, calib } = useMemo(() => {
    const now = new Date();
    const curMes = now.getMonth() + 1;
    const curAno = now.getFullYear();
    const nomeCliente = new Map(clientes.map((c) => [c.id, c.nome]));

    const porEquip = new Map<string, Plano[]>();
    for (const p of planos) {
      const arr = porEquip.get(p.equipamento_id) || [];
      arr.push(p);
      porEquip.set(p.equipamento_id, arr);
    }

    const build = (tipo: "T" | "C"): Linha[] => {
      const out: Linha[] = [];
      for (const eq of equipamentos) {
        if (clienteSel !== "todos" && eq.cliente_id !== clienteSel) continue;
        const regs = (porEquip.get(eq.id) || []).filter((p) => p.tipo_servico === tipo);
        const execs = regs.filter((p) => p.status === "executado");
        const ultima = execs.sort((a, b) => b.ano * 12 + b.mes - (a.ano * 12 + a.mes))[0];
        const base = {
          key: `${eq.id}-${tipo}`,
          equipamento: eq.equipamento,
          clienteNome: nomeCliente.get(eq.cliente_id) || "—",
          localizacao: eq.localizacao || "—",
          unidade: eq.unidade || "—",
          setor: eq.setor || "—",
          ultimaExec: ultima ? fmtMes(ultima.mes, ultima.ano) : "—",
        };

        if (regs.length === 0) {
          out.push({ ...base, situacao: "nunca" });
          continue;
        }

        const vencidos = regs
          .filter((p) => p.status !== "executado" && p.ano * 12 + p.mes < curAno * 12 + curMes)
          .sort((a, b) => a.ano * 12 + a.mes - (b.ano * 12 + b.mes));
        if (vencidos.length > 0) {
          const v = vencidos[0];
          out.push({ ...base, situacao: "vencido", refMes: v.mes, refAno: v.ano });
        }
      }
      return out.sort((a, b) => {
        if (a.situacao !== b.situacao) return a.situacao === "vencido" ? -1 : 1;
        const c = a.clienteNome.localeCompare(b.clienteNome, "pt-BR");
        return c !== 0 ? c : a.equipamento.localeCompare(b.equipamento, "pt-BR");
      });
    };

    return { tse: build("T"), calib: build("C") };
  }, [equipamentos, planos, clientes, clienteSel]);

  const kpis = [
    { label: "TSE Vencidos", value: tse.filter((l) => l.situacao === "vencido").length, color: "text-destructive" },
    { label: "TSE Nunca Agendados", value: tse.filter((l) => l.situacao === "nunca").length, color: "text-muted-foreground" },
    { label: "Calibrações Vencidas", value: calib.filter((l) => l.situacao === "vencido").length, color: "text-destructive" },
    { label: "Calibrações Nunca Agendadas", value: calib.filter((l) => l.situacao === "nunca").length, color: "text-muted-foreground" },
  ];

  const exportarCSV = () => {
    const header = ["Tipo", "Equipamento", "Cliente", "Localização", "Unidade", "Setor", "Situação", "Referência", "Última execução"];
    const rows: string[][] = [];
    const push = (tipo: string, l: Linha) =>
      rows.push([
        tipo,
        l.equipamento,
        l.clienteNome,
        l.localizacao,
        l.unidade,
        l.setor,
        l.situacao === "vencido" ? "Vencido" : "Nunca agendado",
        l.situacao === "vencido" ? fmtMes(l.refMes, l.refAno) : "—",
        l.ultimaExec,
      ]);
    tse.forEach((l) => push("TSE", l));
    calib.forEach((l) => push("Calibração", l));
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `checagem-tse-calibracao-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const Tabela = ({ titulo, linhas }: { titulo: string; linhas: Linha[] }) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {titulo} <span className="text-muted-foreground font-normal">({linhas.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {linhas.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma pendência nesta categoria.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipamento</TableHead>
                {clienteSel === "todos" && <TableHead>Cliente</TableHead>}
                <TableHead>Localização / Unidade / Setor</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Última execução</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((l) => (
                <TableRow key={l.key}>
                  <TableCell className="font-medium">{l.equipamento}</TableCell>
                  {clienteSel === "todos" && <TableCell>{l.clienteNome}</TableCell>}
                  <TableCell className="text-sm text-muted-foreground">
                    {l.localizacao} / {l.unidade} / {l.setor}
                  </TableCell>
                  <TableCell>
                    {l.situacao === "vencido" ? (
                      <Badge variant="destructive">Vencido — {fmtMes(l.refMes, l.refAno)}</Badge>
                    ) : (
                      <Badge variant="secondary">Nunca agendado</Badge>
                    )}
                  </TableCell>
                  <TableCell>{l.ultimaExec}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  if (loading) return <TableSkeleton rows={8} />;

  const tudoEmDia = tse.length === 0 && calib.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-7 w-7 text-primary mt-0.5" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Checagem de TSE e Certificados</h1>
            <p className="text-sm text-muted-foreground">
              Lista de equipamentos com Teste de Segurança Elétrica ou Calibração vencidos ou nunca agendados
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={clienteSel} onValueChange={setClienteSel}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os clientes</SelectItem>
              {clientes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportarCSV} disabled={tudoEmDia}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Lista
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {tudoEmDia ? (
        <Card className="border-emerald-500/40 bg-emerald-500/5">
          <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="text-emerald-600 font-medium">
              ✅ Nenhum TSE ou Calibração vencido ou pendente de agendamento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Tabela titulo="TSE — Teste de Segurança Elétrica" linhas={tse} />
          <Tabela titulo="Calibração / Certificado" linhas={calib} />
        </>
      )}
    </div>
  );
}