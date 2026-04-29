import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DashboardSkeleton } from "@/components/LoadingSkeleton";
import { ErrorState } from "@/components/ErrorState";
import { useManutencaoData } from "@/hooks/useManutencaoData";

const MES_ORDEM: Record<string, number> = {
  janeiro: 1, fevereiro: 2, março: 3, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

function mesIndex(mes: string) {
  return MES_ORDEM[mes.trim().toLowerCase()] ?? 0;
}

export default function Manutencao() {
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState<string>("");

  const { indicadores, loading, error } = useManutencaoData();

  const periodos = useMemo(() => {
    const set = new Map<string, { mes: string; ano: number }>();
    for (const i of indicadores) {
      const key = `${i.ano}-${i.mes}`;
      if (!set.has(key)) set.set(key, { mes: i.mes, ano: i.ano });
    }
    return Array.from(set.values()).sort((a, b) => {
      if (a.ano !== b.ano) return a.ano - b.ano;
      return mesIndex(a.mes) - mesIndex(b.mes);
    });
  }, [indicadores]);

  useEffect(() => {
    if (!periodo && periodos.length > 0) {
      const last = periodos[periodos.length - 1];
      setPeriodo(`${last.ano}-${last.mes}`);
    }
  }, [periodos, periodo]);

  const [anoSel, mesSel] = useMemo(() => {
    if (!periodo) return [undefined, undefined] as const;
    const [a, ...rest] = periodo.split("-");
    return [Number(a), rest.join("-")] as const;
  }, [periodo]);

  // Subscribe to filtered tecnicos via hook (separate instance)
  const { tecnicosMes } = useManutencaoData(mesSel, anoSel);
  void tecnicosMes;

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Dashboard de Manutenção</h1>
        <div className="flex items-center gap-2">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecione o mês" />
            </SelectTrigger>
            <SelectContent>
              {periodos.map(p => (
                <SelectItem key={`${p.ano}-${p.mes}`} value={`${p.ano}-${p.mes}`}>
                  {p.mes} / {p.ano}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => navigate("/manutencao/upload")} className="gap-2">
            <Upload className="h-4 w-4" />
            Importar Excel
          </Button>
        </div>
      </div>

      <Tabs defaultValue="visao" className="w-full">
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full">
          <TabsTrigger value="visao">Visão Geral</TabsTrigger>
          <TabsTrigger value="eng">Engenharia Clínica</TabsTrigger>
          <TabsTrigger value="pred">Manutenção Predial</TabsTrigger>
          <TabsTrigger value="sla">Análise de SLA</TabsTrigger>
          <TabsTrigger value="tec">Desempenho Técnico</TabsTrigger>
        </TabsList>

        {[
          { v: "visao", label: "Visão Geral" },
          { v: "eng", label: "Engenharia Clínica" },
          { v: "pred", label: "Manutenção Predial" },
          { v: "sla", label: "Análise de SLA" },
          { v: "tec", label: "Desempenho Técnico" },
        ].map(t => (
          <TabsContent key={t.v} value={t.v} className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Em construção — {t.label}</p>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}