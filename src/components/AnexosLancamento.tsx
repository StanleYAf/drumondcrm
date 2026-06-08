import { useEffect, useRef, useState } from "react";
import { Paperclip, Trash2, Download, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { toast } from "sonner";

export interface Anexo {
  id: string;
  nome: string;
  path: string;
  tipo?: string | null;
  tamanho?: number | null;
}

const ACCEPT = "image/*,application/pdf";
const MAX_MB = 10;

function formatSize(b?: number | null) {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export function AnexosLancamento({ lancamentoId }: { lancamentoId: string }) {
  const { user } = useAuth();
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("lancamento_anexos")
      .select("*")
      .eq("lancamento_id", lancamentoId)
      .order("created_at", { ascending: true });
    if (error) toast.error("Erro ao carregar anexos");
    else setAnexos((data ?? []) as Anexo[]);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [lancamentoId]);

  async function handleUpload(files: FileList | null) {
    if (!files || !user) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_MB * 1024 * 1024) {
          toast.error(`${file.name}: máximo ${MAX_MB}MB`);
          continue;
        }
        const safe = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${user.id}/${lancamentoId}/${crypto.randomUUID()}-${safe}`;
        const up = await supabase.storage.from("lancamento-anexos").upload(path, file, {
          contentType: file.type || undefined,
          upsert: false,
        });
        if (up.error) { toast.error(`Falha ao enviar ${file.name}`); continue; }
        const ins = await supabase.from("lancamento_anexos").insert({
          lancamento_id: lancamentoId,
          user_id: user.id,
          nome: file.name,
          path,
          tipo: file.type || null,
          tamanho: file.size,
        });
        if (ins.error) {
          await supabase.storage.from("lancamento-anexos").remove([path]);
          toast.error(`Falha ao salvar ${file.name}`);
        }
      }
      await load();
      toast.success("Anexos enviados");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleOpen(a: Anexo) {
    const { data, error } = await supabase.storage
      .from("lancamento-anexos")
      .createSignedUrl(a.path, 60 * 5);
    if (error || !data) { toast.error("Não foi possível abrir o anexo"); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function handleDelete(a: Anexo) {
    if (!confirm(`Excluir anexo "${a.nome}"?`)) return;
    await supabase.storage.from("lancamento-anexos").remove([a.path]);
    const { error } = await supabase.from("lancamento_anexos").delete().eq("id", a.id);
    if (error) { toast.error("Erro ao excluir anexo"); return; }
    setAnexos((prev) => prev.filter((x) => x.id !== a.id));
    toast.success("Anexo excluído");
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium text-muted-foreground">Anexos (PDF ou imagens)</label>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 text-xs font-medium text-primary disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
          {uploading ? "Enviando..." : "Adicionar"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground text-center py-2">Carregando anexos...</p>
      ) : anexos.length === 0 ? (
        <p className="text-[11px] text-muted-foreground text-center py-2 border border-dashed border-border rounded-lg">
          Nenhum anexo. Máx. {MAX_MB}MB por arquivo.
        </p>
      ) : (
        <div className="space-y-1.5">
          {anexos.map((a) => {
            const isImg = (a.tipo || "").startsWith("image/");
            return (
              <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border">
                {isImg ? <ImageIcon className="h-4 w-4 text-primary flex-shrink-0" /> : <FileText className="h-4 w-4 text-primary flex-shrink-0" />}
                <button
                  type="button"
                  onClick={() => handleOpen(a)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="text-xs font-medium text-foreground truncate">{a.nome}</p>
                  <p className="text-[10px] text-muted-foreground">{formatSize(a.tamanho)}</p>
                </button>
                <button type="button" onClick={() => handleOpen(a)} className="p-1 rounded hover:bg-muted">
                  <Download className="h-3.5 w-3.5 text-primary" />
                </button>
                <button type="button" onClick={() => handleDelete(a)} className="p-1 rounded hover:bg-muted">
                  <Trash2 className="h-3.5 w-3.5" style={{ color: "#FF453A" }} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}