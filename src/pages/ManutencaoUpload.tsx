import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Upload, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_URL } from "@/lib/config";
import { cn } from "@/lib/utils";

const ACCEPTED = [".xls", ".xlsx"];

export default function ManutencaoUpload() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        toast.success("Dados importados com sucesso!");
        navigate("/manutencao");
      } else {
        let msg = "Erro ao processar o arquivo";
        try {
          const data = await res.json();
          msg = data?.message || data?.error || data?.detail || msg;
        } catch {
          // ignore
        }
        toast.error(msg);
      }
    } catch {
      toast.error("Erro ao processar o arquivo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4">
      <Button
        variant="ghost"
        onClick={() => navigate("/manutencao")}
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
                disabled={loading}
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