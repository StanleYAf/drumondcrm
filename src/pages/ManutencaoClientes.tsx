import { useEffect, useState } from "react";
import { Plus, Pencil, Power } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
}

export default function ManutencaoClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [nome, setNome] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [saving, setSaving] = useState(false);

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
    setOpen(true);
  };

  const openEdit = (c: Cliente) => {
    setEditing(c);
    setNome(c.nome);
    setResponsavel(c.responsavel || "");
    setAtivo(c.ativo);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      toast.error("Nome do cliente é obrigatório");
      return;
    }
    setSaving(true);
    const payload = {
      nome: nome.trim(),
      responsavel: responsavel.trim() || null,
      ativo,
    };
    const { error } = editing
      ? await supabase.from("clientes").update(payload).eq("id", editing.id)
      : await supabase.from("clientes").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editing ? "Cliente atualizado com sucesso!" : "Cliente cadastrado com sucesso!");
    setOpen(false);
    load();
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

  const formatDate = (iso: string) => {
    const [y, m, d] = iso.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
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
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
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
                    <TableCell className="font-medium">{c.nome}</TableCell>
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
                          onClick={() => toggleAtivo(c)}
                        >
                          <Power className="h-3.5 w-3.5" />
                          {c.ativo ? "Desativar" : "Ativar"}
                        </Button>
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
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
