import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DashboardSkeleton } from "@/components/LoadingSkeleton";
import { ErrorState } from "@/components/ErrorState";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";

const MES_ORDEM: Record<string, number> = {
  janeiro: 1, fevereiro: 2, março: 3, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};
const mesIdx = (m: string) => MES_ORDEM[(m || "").trim().toLowerCase()] ?? 0;
const num = (v: any) => (v === null || v === undefined ? 0 : Number(v) || 0);
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);

interface Cliente { id: string; nome: string; responsavel: string | null; ativo: boolean; }
interface Indicador { cliente_id: string; mes: string; ano: number; [k: string]: any; }

function statusBadgeCls(sla: number) {
  if (sla >= 80) return "bg-green-500/15 text-green-500 border-green-500/30";
  return "bg-yellow-500/15 text-yellow-500 border-yellow-500/30";
}

export default function ManutencaoGeral() {
  const navigate = useNavigate();
  const { hasCargo } = useAuth();
  const isAdmin = hasCargo("admin");

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [indicadores, setIndicadores] = useState<Indicador[]>([]);
  const [periodo, setPeriodo] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [cRes, iRes] = await Promise.all([
          supabase.from("clientes").select("id, nome, responsavel, ativo").eq("ativo", true).order("nome"),
          supabase.from("indicadores_manutencao").select("*"),
        ]);
        if (cRes.error) throw cRes.error;
        if (iRes.error) throw iRes.error;
        if (!cancelled) {
          setClientes((cRes.data || []) as Cliente[]);
          setIndicadores((iRes.data || []) as Indicador[]);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Erro ao carregar dados");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const periodos = useMemo(() => {
    const map = new Map<string, { mes: string; ano: number }>();
    for (const i of indicadores) {
      const k = `${i.ano}-${i.mes}`;
      if (!map.has(k)) map.set(k, { mes: i.mes, ano: i.ano });
    }
    return Array.from(map.values()).sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : mesIdx(a.mes) - mesIdx(b.mes));
  }, [indicadores]);

  useEffect(() => {
    if (!periodo && periodos.length > 0) {
      const last = periodos[periodos.length - 1];
      setPeriodo(`${last.ano}-${last.mes}`);
    }
  }, [periodos, periodo]);

  const [anoSel, mesSel] = useMemo(() => {
    if (!periodo) return [undefined, undefined] as const;
    const [a, ...r] = periodo.split("-");
    return [Number(a), r.join("-")] as const;
  }, [periodo]);

  const indicadoresMes = useMemo(
    () => indicadores.filter(i => i.ano === anoSel && i.mes === mesSel),
    [indicadores, anoSel, mesSel],
  );

  const porCliente = useMemo(() => {
    return clientes.map(c => {
      const ind = indicadoresMes.find(i => i.cliente_id === c.id);
      const slaEng = num(ind?.eng_pct_sla_triagem_urgente);
      const slaPred = num(ind?.pred_pct_sla_triagem_urgente);
      const slaMedio = ind ? (slaEng + slaPred) / 2 : 0;
      const totalOs = num(ind?.total_corretivas_abertas) + num(ind?.total_preventivas_abertas);
      return {
        cliente: c,
        ind,
        slaEng,
        slaPred,
        slaMedio,
        totalOs,
        corretivasAbertas: num(ind?.total_corretivas_abertas),
        corretivasFechadas: num(ind?.total_corretivas_fechadas),
        preventivasAbertas: num(ind?.total_preventivas_abertas),
        preventivasFechadas: num(ind?.total_preventivas_fechadas),
      };
    });
  }, [clientes, indicadoresMes]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Visão Geral — Manutenção</h1>
          <p className="text-sm text-muted-foreground mt-1">Indicadores consolidados de todos os clientes</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecione o mês" />
            </SelectTrigger>
            <SelectContent>
              {periodos.map(p => (
                <SelectItem key={`${p.ano}-${p.mes}`} value={`${p.ano}-${p.mes}`}>
                  {cap(p.mes)} / {p.ano}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isAdmin && (
            <Button onClick={() => navigate("/manutencao/clientes")} variant="outline" className="gap-2">
              <Building2 className="h-4 w-4" /> Gerenciar Clientes
            </Button>
          )}
        </div>
      </div>

      {periodos.length === 0 && clientes.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            Nenhum cliente cadastrado ainda. Acesse <strong>Gerenciar Clientes</strong> para começar.
          </CardContent>
        </Card>
      )}

      {(periodos.length > 0 || clientes.length > 0) && (
        <>
          {periodos.length === 0 && (
            <Card>
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                Nenhum dado de manutenção importado ainda. Os clientes ativos aparecem abaixo — abra um deles e use <strong>Importar Excel</strong> para carregar o primeiro mês.
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {porCliente.map(p => {
              const semDados = !p.ind;
              return (
                <Card key={p.cliente.id}>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{p.cliente.nome}</p>
                        {p.cliente.responsavel && (
                          <p className="text-xs text-muted-foreground truncate">{p.cliente.responsavel}</p>
                        )}
                      </div>
                      {semDados ? (
                        <Badge variant="outline" className="bg-muted text-muted-foreground border-border">Sem dados</Badge>
                      ) : (
                        <Badge variant="outline" className={statusBadgeCls(p.slaMedio)}>
                          {p.slaMedio >= 80 ? "Bom" : "Atenção"}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div className="rounded-lg bg-secondary/40 p-2">
                        <div className="text-lg font-bold">{p.corretivasAbertas}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Corr. Abertas</div>
                      </div>
                      <div className="rounded-lg bg-secondary/40 p-2">
                        <div className="text-lg font-bold">{p.corretivasFechadas}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Corr. Fechadas</div>
                      </div>
                      <div className="rounded-lg bg-secondary/40 p-2">
                        <div className="text-lg font-bold">{p.preventivasAbertas}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Prev. Abertas</div>
                      </div>
                      <div className="rounded-lg bg-secondary/40 p-2">
                        <div className="text-lg font-bold">{p.preventivasFechadas}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Prev. Fechadas</div>
                      </div>
                    </div>


                    <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => navigate(`/manutencao/cliente/${p.cliente.id}`)}>
                      Ver dashboard completo <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

        </>
      )}
    </div>
  );
}