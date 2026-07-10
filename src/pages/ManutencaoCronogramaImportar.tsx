import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { Loader2, Upload, ArrowLeft, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface ClienteOption { id: string; nome: string }

type EquipRow = {
  equipamento: string;
  modelo: string | null;
  marca: string | null;
  localizacao: string | null;
  identificacao: string | null;
  registro_anvisa: string | null;
  numero_serie: string | null;
  patrimonio: string | null;
  tem_contrato_terceiro: boolean;
  status: string;
  fornecedor: string | null;
  descontinuidade: boolean;
  periodicidade: string | null;
};

const s = (v: any): string | null => {
  if (v === null || v === undefined) return null;
  const t = String(v).trim();
  return t.length ? t : null;
};
const isSim = (v: any) => {
  const t = (s(v) || "").toUpperCase();
  return t === "SIM" || t === "S" || t === "TRUE" || t === "1";
};

export default function ManutencaoCronogramaImportar() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [clienteId, setClienteId] = useState<string>("");
  const [rows, setRows] = useState<EquipRow[]>([]);

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

  const isValid = (f: File) => /\.xlsx?$/i.test(f.name);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (!isValid(f)) {
      toast.error("Formato inválido. Envie um arquivo .xls ou .xlsx");
      return;
    }
    setFile(f);
    setRows([]);
  };

  const handleParse = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.SheetNames.find((n) => n.toLowerCase().includes("cronograma"));
      if (!sheetName) {
        toast.error('Nenhuma aba contendo "Cronograma" foi encontrada.');
        return;
      }
      const ws = wb.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: null, blankrows: false });
      const parsed: EquipRow[] = [];
      for (let i = 2; i < data.length; i++) {
        const r = data[i] || [];
        const equipamento = s(r[0]);
        if (!equipamento || equipamento === "---") continue;
        parsed.push({
          equipamento,
          modelo: s(r[1]),
          marca: s(r[2]),
          localizacao: s(r[3]),
          identificacao: s(r[4]),
          registro_anvisa: s(r[5]),
          numero_serie: s(r[6]),
          patrimonio: s(r[7]),
          tem_contrato_terceiro: isSim(r[8]),
          status: s(r[9]) || "Ativo",
          fornecedor: s(r[10]),
          descontinuidade: isSim(r[11]),
          periodicidade: s(r[12]),
        });
      }
      if (parsed.length === 0) {
        toast.error("Nenhuma linha válida encontrada na aba de cronograma.");
        return;
      }
      setRows(parsed);
      toast.success(`Prévia gerada: ${parsed.length} equipamento(s) encontrado(s).`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao ler o arquivo");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!clienteId) {
      toast.error("Selecione um cliente antes de confirmar.");
      return;
    }
    if (rows.length === 0) return;
    setSaving(true);
    try {
      const payload = rows.map((r) => ({ ...r, cliente_id: clienteId }));
      const chunk = 500;
      for (let i = 0; i < payload.length; i += chunk) {
        const { error } = await supabase
          .from("cronograma_equipamentos")
          .insert(payload.slice(i, i + chunk));
        if (error) throw error;
      }
      toast.success(`${rows.length} equipamento(s) importado(s) com sucesso.`);
      setRows([]);
      setFile(null);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao importar equipamentos");
    } finally {
      setSaving(false);
    }
  };

  const preview = rows.slice(0, 10);

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4">
      <Button variant="ghost" onClick={() => navigate("/manutencao")} className="mb-4">
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarClock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Importar Cronograma de Equipamentos</CardTitle>
              <CardDescription>
                Envie a planilha do cronograma para cadastrar os equipamentos do cliente.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
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

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors",
              isDragging ? "border-primary bg-primary/5" : "border-border bg-muted/20",
            )}
          >
            <Upload className="h-10 w-10 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Arraste o arquivo aqui</p>
              <p className="text-xs text-muted-foreground">Aceita .xls e .xlsx</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".xls,.xlsx"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={loading || saving}>
              Selecionar arquivo
            </Button>
          </div>

          {file && (
            <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Arquivo</p>
                  <p className="text-sm font-medium break-all">{file.name}</p>
                </div>
                <Button onClick={handleParse} disabled={loading || saving} variant="secondary">
                  {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Lendo...</>) : "Gerar prévia"}
                </Button>
              </div>
            </div>
          )}

          {rows.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Prévia: mostrando {preview.length} de <span className="font-semibold text-foreground">{rows.length}</span> equipamento(s).
                </p>
              </div>
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipamento</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Localização</TableHead>
                      <TableHead>Nº Série</TableHead>
                      <TableHead>Patrimônio</TableHead>
                      <TableHead>Contr. Terc.</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Descont.</TableHead>
                      <TableHead>Periodicidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.equipamento}</TableCell>
                        <TableCell>{r.modelo || "—"}</TableCell>
                        <TableCell>{r.marca || "—"}</TableCell>
                        <TableCell>{r.localizacao || "—"}</TableCell>
                        <TableCell>{r.numero_serie || "—"}</TableCell>
                        <TableCell>{r.patrimonio || "—"}</TableCell>
                        <TableCell>{r.tem_contrato_terceiro ? "Sim" : "Não"}</TableCell>
                        <TableCell>{r.status}</TableCell>
                        <TableCell>{r.fornecedor || "—"}</TableCell>
                        <TableCell>{r.descontinuidade ? "Sim" : "Não"}</TableCell>
                        <TableCell>{r.periodicidade || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button onClick={handleImport} disabled={saving || !clienteId} className="w-full">
                {saving ? (<><Loader2 className="h-4 w-4 animate-spin" /> Importando...</>) : `Confirmar Importação (${rows.length})`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}