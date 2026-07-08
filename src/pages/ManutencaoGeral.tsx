import { useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardSkeleton } from "@/components/LoadingSkeleton";
import { ErrorState } from "@/components/ErrorState";
import { useAuth } from "@/lib/authContext";
import { SatisfacaoCliente } from "@/pages/Manutencao";

import { useEngenhariaData, type Filtros } from "@/features/engenharia/hooks/useEngenhariaData";
import { FiltrosGlobais } from "@/features/engenharia/components/FiltrosGlobais";
import { ClienteCard } from "@/features/engenharia/components/ClienteCard";
import { ProdutividadeTecnicos } from "@/features/engenharia/components/ProdutividadeTecnicos";
import { PendenciasTecnicoBar } from "@/features/engenharia/components/PendenciasTecnicoBar";

export default function ManutencaoGeral() {
  const navigate = useNavigate();
  const { hasCargo } = useAuth();
  const isAdmin = hasCargo("admin");

  // ---------- Filtros sincronizados com a URL
  const [searchParams, setSearchParams] = useSearchParams();

  const filtros: Filtros = useMemo(() => ({
    clienteId: searchParams.get("cliente") || undefined,
    tecnico:   searchParams.get("tecnico") || undefined,
    mes:       searchParams.get("mes") || undefined,
    ano:       searchParams.get("ano") ? Number(searchParams.get("ano")) : undefined,
    tipo:      (searchParams.get("tipo") as Filtros["tipo"]) || undefined,
    status:    (searchParams.get("status") as Filtros["status"]) || undefined,
  }), [searchParams]);

  const setFiltros = useCallback((patch: Partial<Filtros>) => {
    const next = new URLSearchParams(searchParams);
    const apply = (k: string, v?: string | number) => {
      if (v === undefined || v === null || v === "" || v === "todas") next.delete(k);
      else next.set(k, String(v));
    };
    if ("clienteId" in patch) apply("cliente", patch.clienteId);
    if ("tecnico" in patch)   apply("tecnico", patch.tecnico);
    if ("mes" in patch)       apply("mes", patch.mes);
    if ("ano" in patch)       apply("ano", patch.ano);
    if ("tipo" in patch)      apply("tipo", patch.tipo);
    if ("status" in patch)    apply("status", patch.status);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const resetFiltros = useCallback(() => setSearchParams(new URLSearchParams(), { replace: true }), [setSearchParams]);

  // ---------- Dados
  const {
    loading, error,
    clientes, periodos, tecnicosUnicos,
    clientesAgg, tecnicosAgg,
  } = useEngenhariaData(filtros);

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Visão Geral — Manutenção</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Indicadores consolidados de todos os clientes
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => navigate("/manutencao/clientes")} variant="outline" className="gap-2">
            <Building2 className="h-4 w-4" /> Gerenciar Clientes
          </Button>
        )}
      </div>

      <FiltrosGlobais
        filtros={filtros}
        onChange={setFiltros}
        onReset={resetFiltros}
        clientes={clientes.map((c) => ({ id: c.id, nome: c.nome }))}
        tecnicos={tecnicosUnicos}
        periodos={periodos}
      />

      {periodos.length === 0 && clientes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            Nenhum cliente cadastrado ainda. Acesse <strong>Gerenciar Clientes</strong> para começar.
          </CardContent>
        </Card>
      ) : (
        <>
          {periodos.length === 0 && (
            <Card>
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                Nenhum dado de manutenção importado ainda. Abra um cliente e use <strong>Importar Excel</strong> para carregar o primeiro mês.
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientesAgg.map((agg) => (
              <ClienteCard key={agg.cliente.id} agg={agg} />
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <ProdutividadeTecnicos tecnicos={tecnicosAgg} />
            <PendenciasTecnicoBar tecnicos={tecnicosAgg} />
          </div>

          <SatisfacaoCliente />
        </>
      )}
    </div>
  );
}