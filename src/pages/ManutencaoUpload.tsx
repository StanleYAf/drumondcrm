import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Upload, ArrowLeft, Building2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { parseManutencaoXlsx } from "@/lib/manutencaoParser";

const ACCEPTED = [".xls", ".xlsx"];

interface ClienteOption {
  id: string;
  nome: string;
}

export default function ManutencaoUpload() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlClienteId = searchParams.get("cliente");

  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [clienteId, setClienteId] = useState<string>(urlClienteId || "");
  const [clienteNome, setClienteNome] = useState<string | null>(null);

  // Carrega lista de clientes ativos
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("clientes")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome", { ascending: true });
      setClientes((data || []) as ClienteOption[]);
    })();
  }, []);

  // Resolve nome do cliente vindo da URL
  useEffect(() => {
    if (!urlClienteId) {
      setClienteNome(null);
      return;
    }
    const local = clientes.find((c) => c.id === urlClienteId);
    if (local) {
      setClienteNome(local.nome);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("clientes")
        .select("nome")
        .eq("id", urlClienteId)
        .maybeSingle();
      if (data?.nome) setClienteNome(data.nome);
    })();
  }, [urlClienteId, clientes]);

  const isValid = (f: File) => {
    const name = f.name.toLowerCase();
    return ACCEPTED.some((ext) => name.endsWith(ext));
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (!isValid(f)) {
      toast.error("Formato inválido. Envie um arquivo .xls ou .xlsx");
      return;
    }
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleProcess = async () => {
    if (!file) return;
    const finalClienteId = urlClienteId || clienteId;
    if (!finalClienteId) {
      toast.error("Selecione um cliente antes de processar");
      return;
    }
    setLoading(true);
    try {
      const { indicadores, tecnicos, ordensServico, totalLinhas } = await parseManutencaoXlsx(file, finalClienteId);
      if (indicadores.length === 0) {
        toast.error("Nenhuma linha válida encontrada no arquivo");
        return;
      }

      // Apagar e regravar os meses presentes no arquivo (apenas deste cliente)
      const pares = indicadores.map((i) => ({ mes: i.mes, ano: i.ano }));
      for (const { mes, ano } of pares) {
        await supabase
          .from("indicadores_manutencao")
          .delete()
          .eq("cliente_id", finalClienteId)
          .eq("mes", mes)
          .eq("ano", ano);
        await supabase
          .from("tecnicos_manutencao")
          .delete()
          .eq("cliente_id", finalClienteId)
          .eq("mes", mes)
          .eq("ano", ano);
        await supabase
          .from("ordens_servico")
          .delete()
          .eq("cliente_id", finalClienteId)
          .eq("mes", mes)
          .eq("ano", ano);
      }

      const { error: indErr } = await supabase.from("indicadores_manutencao").insert(indicadores);
      if (indErr) throw indErr;

      if (tecnicos.length > 0) {
        const { error: tecErr } = await supabase.from("tecnicos_manutencao").insert(tecnicos);
        if (tecErr) throw tecErr;
      }

      if (ordensServico.length > 0) {
        // insert em lotes para evitar payload muito grande
        const chunkSize = 500;
        for (let i = 0; i < ordensServico.length; i += chunkSize) {
          const chunk = ordensServico.slice(i, i + chunkSize);
          const { error: osErr } = await supabase.from("ordens_servico").insert(chunk);
          if (osErr) throw osErr;
        }
      }

      toast.success(`Importado: ${totalLinhas} linhas, ${indicadores.length} mês(es), ${tecnicos.length} técnico(s), ${ordensServico.length} OS.`);
      navigate(`/manutencao/cliente/${finalClienteId}`);
    } catch (e: any) {
      console.error("Erro upload manutenção:", e);
      toast.error(e?.message || "Erro ao processar o arquivo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4">
      <Button
        variant="ghost"
        onClick={() => navigate(urlClienteId ? `/manutencao/cliente/${urlClienteId}` : "/manutencao")}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Importar dados do mês</CardTitle>
          <CardDescription>
            Faça upload do arquivo Excel gerado pelo sistema de ordens de serviço
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {urlClienteId && clienteNome ? (
            <div className="flex items-center gap-3 rounded-lg border bg-primary/5 p-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Importando dados para</p>
                <p className="text-sm font-medium">{clienteNome}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/20",
            )}
          >
            <Upload className="h-10 w-10 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Arraste e solte o arquivo aqui
              </p>
              <p className="text-xs text-muted-foreground">
                Aceita arquivos .xls e .xlsx
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".xls,.xlsx"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={loading}
            >
              Selecionar arquivo
            </Button>
          </div>

          {file && (
            <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
              <div>
                <p className="text-xs text-muted-foreground">
                  Arquivo selecionado
                </p>
                <p className="text-sm font-medium break-all">{file.name}</p>
              </div>
              <Button
                onClick={handleProcess}
                disabled={loading || (!urlClienteId && !clienteId)}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processando dados do mês...
                  </>
                ) : (
                  "Processar dados"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
