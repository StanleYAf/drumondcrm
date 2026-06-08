import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { toast } from "sonner";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

type SectionKey =
  | "lancamentos"
  | "indicadores"
  | "pos_venda"
  | "leads"
  | "notas"
  | "produtos1"
  | "produtos2"
  | "mov1"
  | "mov2"
  | "vendedores";

interface SectionState {
  done: boolean;
  count: number;
  loading: boolean;
  progress: number;
}

const SECTION_LABELS: Record<SectionKey, string> = {
  lancamentos: "Lançamentos",
  indicadores: "Indicadores Semanais",
  pos_venda: "Pós-Venda",
  leads: "Leads",
  notas: "Notas de Contato",
  produtos1: "Produtos DSH",
  produtos2: "Produtos DMedical",
  mov1: "Movimentações DSH",
  mov2: "Movimentações DMedical",
  vendedores: "Vendedores",
};

const detectDelimiter = (headerLine: string) => {
  const c = (headerLine.match(/,/g) || []).length;
  const s = (headerLine.match(/;/g) || []).length;
  return s > c ? ";" : ",";
};

const parseCSV = (text: string, delimiter: string | "auto" = "auto") => {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (lines.length === 0) return [];
  const delim = delimiter === "auto" ? detectDelimiter(lines[0]) : delimiter;
  const headers = lines[0].split(delim).map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const values = line.split(delim).map((v) => v.trim().replace(/^"|"$/g, ""));
    return Object.fromEntries(headers.map((h, i) => [h, values[i] === "" || values[i] === undefined ? null : values[i]]));
  });
};

const chunk = <T,>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

export default function Migracao() {
  const { user } = useAuth();
  const [state, setState] = useState<Record<SectionKey, SectionState>>(() =>
    Object.fromEntries(
      (Object.keys(SECTION_LABELS) as SectionKey[]).map((k) => [
        k,
        { done: false, count: 0, loading: false, progress: 0 },
      ]),
    ) as Record<SectionKey, SectionState>,
  );

  const update = (k: SectionKey, patch: Partial<SectionState>) =>
    setState((s) => ({ ...s, [k]: { ...s[k], ...patch } }));

  const readFile = (f: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = () => rej(r.error);
      r.readAsText(f);
    });

  const upsertChunks = async (
    table: string,
    rows: any[],
    key: SectionKey,
    onConflict?: string,
  ) => {
    if (rows.length === 0) {
      update(key, { done: true, count: 0, loading: false, progress: 100 });
      return;
    }
    const chunks = chunk(rows, 200);
    let inserted = 0;
    for (let i = 0; i < chunks.length; i++) {
      const q = supabase.from(table as any).upsert(chunks[i], onConflict ? { onConflict } : undefined);
      const { error } = await q;
      if (error) throw error;
      inserted += chunks[i].length;
      update(key, { progress: Math.round((inserted / rows.length) * 100) });
    }
    update(key, { done: true, count: rows.length, loading: false, progress: 100 });
  };

  const handleComercial = async (file: File) => {
    if (!user) return toast.error("Faça login para migrar");
    try {
      const text = await readFile(file);
      const data = JSON.parse(text);
      const uid = user.id;

      // lancamentos: produtos/servicos/contratos/acessorios
      const tiposMap: Record<string, string> = {
        produtos: "produto",
        servicos: "servico",
        contratos: "contrato",
        acessorios: "acessorio",
      };
      const lancRows: any[] = [];
      const lan = data.lancamentos || {};
      for (const grupo of Object.keys(tiposMap)) {
        const arr = lan[grupo] || [];
        for (const item of arr) {
          lancRows.push({
            id: item.id,
            user_id: uid,
            categoria: tiposMap[grupo],
            cliente: item.cliente,
            valor: Number(item.valor) || 0,
            data: item.data,
            produto: item.produto ?? null,
            servico: item.servico ?? null,
            item: item.item ?? null,
            vendedor: item.vendedor ?? null,
            tipo: item.tipo ?? null,
          });
        }
      }
      update("lancamentos", { loading: true, progress: 0 });
      await upsertChunks("lancamentos", lancRows, "lancamentos", "id");

      const indRows = (data.indicadores_semanais || []).map((r: any) => ({
        id: r.id,
        user_id: uid,
        data: r.data,
        semana: Number(r.semana),
        mes: r.mes,
        ano: Number(r.ano),
        vendedor: r.vendedor,
        captacoes: Number(r.captacoes) || 0,
        orcamentos: Number(r.orcamentos) || 0,
        visitas: Number(r.visitas) || 0,
      }));
      update("indicadores", { loading: true, progress: 0 });
      await upsertChunks("indicadores_semanais", indRows, "indicadores", "id");

      const posRows: any[] = [];
      const notaRows: any[] = [];
      for (const p of data.pos_venda || []) {
        posRows.push({
          id: p.id,
          user_id: uid,
          data: p.data,
          cliente: p.cliente,
          vendedor: p.vendedor,
          status: p.status || "Aguardando retorno",
          status_changed_at: p.status_changed_at ?? null,
        });
        for (const n of p.notas || []) {
          notaRows.push({
            id: n.id,
            pos_venda_id: p.id,
            user_id: uid,
            texto: n.texto,
            created_at: n.timestamp || n.created_at || new Date().toISOString(),
          });
        }
      }
      update("pos_venda", { loading: true, progress: 0 });
      await upsertChunks("pos_venda", posRows, "pos_venda", "id");
      if (notaRows.length > 0) {
        // also store notas from JSON if present (won't conflict with CSV upload later)
        const { error } = await supabase.from("notas_contato").upsert(notaRows, { onConflict: "id" });
        if (error) console.warn("notas_contato (json):", error.message);
      }
    } catch (e: any) {
      toast.error(`Comercial: ${e.message}`);
      update("lancamentos", { loading: false });
      update("indicadores", { loading: false });
      update("pos_venda", { loading: false });
    }
  };

  const handleCSV = async (
    file: File,
    table: string,
    key: SectionKey,
    delimiter: string,
    mapper: (row: any, uid: string) => any,
  ) => {
    if (!user) return toast.error("Faça login para migrar");
    try {
      update(key, { loading: true, progress: 0 });
      const text = await readFile(file);
      const rows = parseCSV(text, delimiter as any)
        .map((r) => mapper(r, user.id))
        .filter((r) => r !== null);
      await upsertChunks(table, rows, key, "id");
    } catch (e: any) {
      toast.error(`${SECTION_LABELS[key]}: ${e.message}`);
      update(key, { loading: false });
    }
  };

  const numOrNull = (v: any) => (v === null || v === undefined || v === "" ? null : Number(v));
  const boolFromCsv = (v: any) =>
    v === null || v === undefined || v === "" ? true : v === "true" || v === "t" || v === "1";

  const mapLead = (r: any, uid: string) => {
    const nome = r.nome_cliente || r.cliente || r.nome;
    if (!nome) return null;
    return {
      id: r.id || crypto.randomUUID(),
      user_id: uid,
      nome_cliente: nome,
      empresa: r.empresa,
      telefone: r.telefone || "",
      email: r.email,
      origem: r.origem || "Outro",
      valor_estimado: numOrNull(r.valor_estimado) ?? 0,
      responsavel: r.responsavel,
      etapa: r.etapa || "novo_lead",
      observacoes: r.observacoes,
      created_at: r.created_at || new Date().toISOString(),
    };
  };

  const mapNota = (r: any, uid: string) => {
    if (!r.pos_venda_id || !r.texto) return null;
    return {
      id: r.id || crypto.randomUUID(),
      pos_venda_id: r.pos_venda_id,
      user_id: uid,
      texto: r.texto,
      created_at: r.created_at || new Date().toISOString(),
    };
  };

  const mapProduto = (r: any, uid: string) => ({
    id: r.id,
    user_id: uid,
    nome: r.nome,
    codigo_barras: r.codigo_barras,
    categoria: r.categoria,
    unidade: r.unidade || "un",
    estoque_atual: numOrNull(r.estoque_atual) ?? 0,
    estoque_minimo: numOrNull(r.estoque_minimo) ?? 1,
    preco_custo: numOrNull(r.preco_custo),
    preco_venda: numOrNull(r.preco_venda),
    fornecedor_id: r.fornecedor_id,
    numero_serie: r.numero_serie,
    ativo: boolFromCsv(r.ativo),
    registro_anvisa: r.registro_anvisa,
    fabricante: r.fabricante,
    validade: r.validade,
    local_estoque: r.local_estoque,
    nome_comercial: r.nome_comercial,
    lote: r.lote,
    foto_url: r.foto_url,
    created_at: r.created_at || undefined,
  });

  const mapMov = (r: any, uid: string) => ({
    id: r.id,
    user_id: uid,
    produto_id: r.produto_id,
    tipo: r.tipo,
    quantidade: numOrNull(r.quantidade) ?? 0,
    motivo: r.motivo,
    documento_ref: r.documento_ref,
    vendedor_id: r.vendedor_id,
    cliente: r.cliente,
    observacao: r.observacao,
    created_at: r.created_at || undefined,
  });

  const mapVendedor = (r: any, uid: string) => ({
    id: r.id,
    user_id: uid,
    nome: r.nome,
    ativo: boolFromCsv(r.ativo),
  });

  const allDone = (Object.keys(SECTION_LABELS) as SectionKey[]).every((k) => state[k].done);

  const FileInput = ({
    accept,
    onPick,
    loading,
    label,
  }: {
    accept: string;
    onPick: (f: File) => void;
    loading: boolean;
    label: string;
  }) => (
    <div className="flex items-center gap-3">
      <Input
        type="file"
        accept={accept}
        disabled={loading}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
        className="max-w-md"
      />
      {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );

  return (
    <div className="container mx-auto max-w-5xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Migração de Dados</h1>
        <p className="text-muted-foreground mt-1">Importe os dados do sistema anterior</p>
      </div>

      {/* Seção 1 */}
      <Card>
        <CardHeader>
          <CardTitle>1. Dados Comerciais</CardTitle>
          <CardDescription>Arquivo JSON: comercial_data_backup.json</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <FileInput
            accept=".json,application/json"
            label="lancamentos + indicadores + pos_venda"
            loading={state.lancamentos.loading || state.indicadores.loading || state.pos_venda.loading}
            onPick={handleComercial}
          />
          {(state.lancamentos.loading || state.indicadores.loading || state.pos_venda.loading) && (
            <Progress value={Math.max(state.lancamentos.progress, state.indicadores.progress, state.pos_venda.progress)} />
          )}
        </CardContent>
      </Card>

      {/* Seção 2 */}
      <Card>
        <CardHeader>
          <CardTitle>2. Leads</CardTitle>
          <CardDescription>CSV separado por vírgula: leads.csv</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <FileInput
            accept=".csv,text/csv"
            label="leads.csv"
            loading={state.leads.loading}
            onPick={(f) => handleCSV(f, "leads", "leads", ",", mapLead)}
          />
          {state.leads.loading && <Progress value={state.leads.progress} />}
        </CardContent>
      </Card>

      {/* Seção 3 */}
      <Card>
        <CardHeader>
          <CardTitle>3. Notas de Contato</CardTitle>
          <CardDescription>CSV separado por vírgula: notas_contato.csv</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <FileInput
            accept=".csv,text/csv"
            label="notas_contato.csv"
            loading={state.notas.loading}
            onPick={(f) => handleCSV(f, "notas_contato", "notas", ",", mapNota)}
          />
          {state.notas.loading && <Progress value={state.notas.progress} />}
        </CardContent>
      </Card>

      {/* Seção 4 */}
      <Card>
        <CardHeader>
          <CardTitle>4. Estoque</CardTitle>
          <CardDescription>CSVs separados por ponto e vírgula</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <FileInput
              accept=".csv,text/csv"
              label="produtos_estoque.csv (DSH)"
              loading={state.produtos1.loading}
              onPick={(f) => handleCSV(f, "produtos_estoque", "produtos1", ";", mapProduto)}
            />
            {state.produtos1.loading && <Progress value={state.produtos1.progress} />}
          </div>
          <div className="space-y-2">
            <FileInput
              accept=".csv,text/csv"
              label="produtos_estoque_2.csv (DMedical)"
              loading={state.produtos2.loading}
              onPick={(f) => handleCSV(f, "produtos_estoque_2", "produtos2", ";", mapProduto)}
            />
            {state.produtos2.loading && <Progress value={state.produtos2.progress} />}
          </div>
          <div className="space-y-2">
            <FileInput
              accept=".csv,text/csv"
              label="movimentacoes_estoque.csv (DSH)"
              loading={state.mov1.loading}
              onPick={(f) => handleCSV(f, "movimentacoes_estoque", "mov1", ";", mapMov)}
            />
            {state.mov1.loading && <Progress value={state.mov1.progress} />}
          </div>
          <div className="space-y-2">
            <FileInput
              accept=".csv,text/csv"
              label="movimentacoes_estoque_2.csv (DMedical)"
              loading={state.mov2.loading}
              onPick={(f) => handleCSV(f, "movimentacoes_estoque_2", "mov2", ";", mapMov)}
            />
            {state.mov2.loading && <Progress value={state.mov2.progress} />}
          </div>
        </CardContent>
      </Card>

      {/* Seção 5 */}
      <Card>
        <CardHeader>
          <CardTitle>5. Vendedores</CardTitle>
          <CardDescription>CSV separado por ponto e vírgula: vendedores.csv</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <FileInput
            accept=".csv,text/csv"
            label="vendedores.csv"
            loading={state.vendedores.loading}
            onPick={(f) => handleCSV(f, "vendedores", "vendedores", ";", mapVendedor)}
          />
          {state.vendedores.loading && <Progress value={state.vendedores.progress} />}
        </CardContent>
      </Card>

      {/* Progresso geral */}
      <Card>
        <CardHeader>
          <CardTitle>Progresso da Migração</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {(Object.keys(SECTION_LABELS) as SectionKey[]).map((k) => (
              <li key={k} className="flex items-center gap-2 text-sm">
                {state[k].done ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : state[k].loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <span>{SECTION_LABELS[k]}</span>
                {state[k].done && (
                  <Badge variant="secondary" className="ml-auto tabular-nums">
                    {state[k].count}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {allDone && (
        <Card className="border-green-500/40 bg-green-500/10">
          <CardContent className="py-8 text-center space-y-4">
            <h2 className="text-2xl font-semibold">🎉 Migração completa!</h2>
            <p className="text-muted-foreground">Todos os dados foram importados com sucesso.</p>
            <Button asChild>
              <Link to="/">Ir para o Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}