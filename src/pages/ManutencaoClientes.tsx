import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Power, Trash2, Link as LinkIcon, Building2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import { ErrorState } from "@/components/ErrorState";

interface Cliente {
  id: string;
  nome: string;
  responsavel: string | null;
  ativo: boolean;
  created_at: string;
  public_token: string | null;
  logo_url: string | null;
}

export default function ManutencaoClientes() {
  const navigate = useNavigate();
  const { hasCargo } = useAuth();
  const isAdmin = hasCargo("admin");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [nome, setNome] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("nome", { ascending: true });
    if (error) setError(error.message);
    else setClientes((data || []) as Cliente[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setNome("");
    setResponsavel("");
    setAtivo(true);
    setLogoUrl(null);
    setLogoFile(null);
    setLogoPreview(null);
    setOpen(true);
  };

  const openEdit = (c: Cliente) => {
    setEditing(c);
    setNome(c.nome);
    setResponsavel(c.responsavel || "");
    setAtivo(c.ativo);
    setLogoUrl(c.logo_url || null);
    setLogoFile(null);
    setLogoPreview(c.logo_url || null);
    setOpen(true);
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|svg\+xml)$/.test(file.type)) {
      toast.error("Selecione uma imagem PNG, JPG, WEBP ou SVG");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 5MB)");
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setLogoUrl(null);
  };

  const uploadLogo = async (clienteId: string): Promise<string | null> => {
    if (!logoFile) return logoUrl;
    setUploadingLogo(true);
    try {
      const ext = logoFile.name.split(".").pop() || "png";
      const path = `${clienteId}/logo.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("client-logos")
        .upload(path, logoFile, { upsert: true, contentType: logoFile.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("client-logos").getPublicUrl(path);
      return `${data.publicUrl}?v=${Date.now()}`;
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      toast.error("Nome do cliente é obrigatório");
      return;
    }
    setSaving(true);
    try {
      const basePayload = {
        nome: nome.trim(),
        responsavel: responsavel.trim() || null,
        ativo,
      };
      let clienteId = editing?.id;
      if (editing) {
        const { error } = await supabase
          .from("clientes")
          .update({ ...basePayload, logo_url: logoUrl })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("clientes")
          .insert(basePayload)
          .select("id")
          .single();
        if (error) throw error;
        clienteId = data.id;
      }

      if (logoFile && clienteId) {
        const newUrl = await uploadLogo(clienteId);
        if (newUrl) {
          await supabase.from("clientes").update({ logo_url: newUrl }).eq("id", clienteId);
        }
      } else if (editing && !logoPreview && editing.logo_url) {
        await supabase.from("clientes").update({ logo_url: null }).eq("id", editing.id);
      }

      toast.success(editing ? "Cliente atualizado com sucesso!" : "Cliente cadastrado com sucesso!");
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const toggleAtivo = async (c: Cliente) => {
    const { error } = await supabase
      .from("clientes")
      .update({ ativo: !c.ativo })
      .eq("id", c.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(!c.ativo ? "Cliente ativado" : "Cliente desativado");
    load();
  };

  const handleDelete = async (c: Cliente) => {
    const { error } = await supabase.from("clientes").delete().eq("id", c.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Cliente excluído com sucesso");
    load();
  };

  const formatDate = (iso: string) => {
    const [y, m, d] = iso.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  };

  const copyPublicLink = async (c: Cliente) => {
    if (!c.public_token) {
      toast.error("Token público ainda não gerado. Edite e salve o cliente.");
      return;
    }
    // Use sempre o domínio publicado para garantir acesso sem login do Lovable.
    // Previews (id-preview--*.lovable.app) exigem login da workspace.
    const origin = window.location.hostname.includes("id-preview")
      ? "https://drumondcrm.lovable.app"
      : window.location.origin;
    const url = `${origin}/publico/cliente/${c.public_token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link público copiado!");
    } catch {
      window.prompt("Copie o link público:", url);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clientes de Manutenção</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os clientes vinculados aos indicadores de manutenção
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="gap-2 text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                  Limpar todos os dados
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Todos os dados de indicadores e técnicos serão apagados permanentemente. Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={clearing}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={clearing}
                    onClick={async (e) => {
                      e.preventDefault();
                      setClearing(true);
                      try {
                        const { error: e1 } = await supabase
                          .from("indicadores_manutencao")
                          .delete()
                          .is("cliente_id", null);
                        if (e1) throw e1;
                        const { error: e2 } = await supabase
                          .from("tecnicos_manutencao")
                          .delete()
                          .is("cliente_id", null);
                        if (e2) throw e2;
                        toast.success("Dados limpos com sucesso! Faça o upload de uma nova planilha.");
                        setConfirmOpen(false);
                        navigate("/manutencao/upload");
                      } catch (err: any) {
                        toast.error(err?.message || "Erro ao limpar dados");
                      } finally {
                        setClearing(false);
                      }
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {clearing ? "Limpando..." : "Sim, limpar tudo"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : clientes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Nenhum cliente cadastrado ainda
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {c.logo_url ? (
                          <img
                            src={c.logo_url}
                            alt={c.nome}
                            className="h-9 w-9 rounded-md object-cover border border-border bg-background"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-md border border-border bg-muted flex items-center justify-center text-muted-foreground">
                            <Building2 className="h-4 w-4" />
                          </div>
                        )}
                        <span>{c.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.responsavel || "—"}
                    </TableCell>
                    <TableCell>
                      {c.ativo ? (
                        <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20 border-0">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(c.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(c)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyPublicLink(c)}
                          title="Copiar link público de visualização"
                        >
                          <LinkIcon className="h-3.5 w-3.5" />
                          Link público
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleAtivo(c)}
                        >
                          <Power className="h-3.5 w-3.5" />
                          {c.ativo ? "Desativar" : "Ativar"}
                        </Button>
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Excluir
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  O cliente <strong>{c.nome}</strong> e todos os seus dados de indicadores e técnicos serão apagados permanentemente. Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(c)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Sim, excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar cliente" : "Novo cliente"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Logo do cliente</Label>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo"
                    className="h-20 w-20 rounded-md object-cover border border-border bg-background"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-md border border-dashed border-border bg-muted flex items-center justify-center text-muted-foreground">
                    <Building2 className="h-7 w-7" />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <label className="inline-flex items-center gap-2 text-sm cursor-pointer rounded-md border border-input bg-background px-3 py-2 hover:bg-accent">
                    <Upload className="h-3.5 w-3.5" />
                    {logoPreview ? "Trocar" : "Enviar logo"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={handleLogoSelect}
                    />
                  </label>
                  {logoPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeLogo}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                      Remover
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, WEBP ou SVG — máx 5MB
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do cliente *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Hospital Santa Casa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="responsavel">Responsável</Label>
              <Input
                id="responsavel"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="ativo" className="cursor-pointer">Ativo</Label>
                <p className="text-xs text-muted-foreground">
                  Clientes inativos ficam ocultos nos relatórios
                </p>
              </div>
              <Switch id="ativo" checked={ativo} onCheckedChange={setAtivo} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving || uploadingLogo}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || uploadingLogo}>
              {saving || uploadingLogo ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
