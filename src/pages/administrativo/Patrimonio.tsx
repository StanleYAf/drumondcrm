import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { applyCurrencyMask, parseCurrencyMask, numberToCurrencyMask } from "@/lib/currencyMask";
import {
  Package, Plus, Pencil, Trash2, Search, DollarSign, AlertCircle,
} from "lucide-react";
import { ListSkeleton } from "@/components/LoadingSkeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface ItemPatrimonio {
  id: string;
  equipamento: string;
  marca_modelo: string | null;
  numero_serie: string | null;
  numero_patrimonio: string | null;
  local: string | null;
  setor: string | null;
  colaborador_responsavel: string | null;
  valor: number | null;
  status: string;
  observacao: string | null;
}

const STATUS_OPTIONS = ["Ativo", "Baixado", "Em manutenção"];

const emptyForm = {
  equipamento: "",
  marca_modelo: "",
  numero_serie: "",
  numero_patrimonio: "",
  local: "",
  setor: "",
  colaborador_responsavel: "",
  valor: "",
  status: "Ativo",
  observacao: "",
};

function formatarValor(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Patrimonio() {
  const [itens, setItens] = useState<ItemPatrimonio[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroLocal, setFiltroLocal] = useState<string>("todos");
  const [filtroSetor, setFiltroSetor] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<ItemPatrimonio | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [salvando, setSalvando] = useState(false);

  const [excluirId, setExcluirId] = useState<string | null>(null);

  const fetchItens = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("patrimonio_administrativo")
      .select("*")
      .order("equipamento");
    if (error) {
      toast.error("Erro ao carregar patrimônio");
    } else {
      setItens((data ?? []) as ItemPatrimonio[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItens();
  }, []);

  const locaisUnicos = useMemo(
    () => Array.from(new Set(itens.map((i) => i.local).filter(Boolean))) as string[],
    [itens]
  );
  const setoresUnicos = useMemo(
    () => Array.from(new Set(itens.map((i) => i.setor).filter(Boolean))) as string[],
    [itens]
  );

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return itens.filter((i) => {
      if (filtroLocal !== "todos" && i.local !== filtroLocal) return false;
      if (filtroSetor !== "todos" && i.setor !== filtroSetor) return false;
      if (filtroStatus !== "todos" && i.status !== filtroStatus) return false;
      if (q) {
        const alvo = [
          i.equipamento, i.marca_modelo, i.numero_serie,
          i.numero_patrimonio, i.colaborador_responsavel,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!alvo.includes(q)) return false;
      }
      return true;
    });
  }, [itens, busca, filtroLocal, filtroSetor, filtroStatus]);

  const kpis = useMemo(() => {
    const total = itens.length;
    const valorTotal = itens.reduce((s, i) => s + (i.valor ?? 0), 0);
    const semValor = itens.filter((i) => i.valor == null).length;
    return { total, valorTotal, semValor };
  }, [itens]);

  function abrirNovo() {
    setEditando(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function abrirEditar(item: ItemPatrimonio) {
    setEditando(item);
    setForm({
      equipamento: item.equipamento,
      marca_modelo: item.marca_modelo ?? "",
      numero_serie: item.numero_serie ?? "",
      numero_patrimonio: item.numero_patrimonio ?? "",
      local: item.local ?? "",
      setor: item.setor ?? "",
      colaborador_responsavel: item.colaborador_responsavel ?? "",
      valor: item.valor != null ? numberToCurrencyMask(item.valor) : "",
      status: item.status,
      observacao: item.observacao ?? "",
    });
    setDialogOpen(true);
  }

  async function salvar() {
    if (!form.equipamento.trim()) {
      toast.error("Informe o nome do equipamento");
      return;
    }
    setSalvando(true);

    const payload = {
      equipamento: form.equipamento.trim(),
      marca_modelo: form.marca_modelo.trim() || null,
      numero_serie: form.numero_serie.trim() || null,
      numero_patrimonio: form.numero_patrimonio.trim() || null,
      local: form.local.trim() || null,
      setor: form.setor.trim() || null,
      colaborador_responsavel: form.colaborador_responsavel.trim() || null,
      valor: form.valor.trim() ? parseCurrencyMask(form.valor) : null,
      status: form.status,
      observacao: form.observacao.trim() || null,
    };

    let error;
    if (editando) {
      ({ error } = await supabase
        .from("patrimonio_administrativo")
        .update(payload)
        .eq("id", editando.id));
    } else {
      ({ error } = await supabase.from("patrimonio_administrativo").insert(payload));
    }

    setSalvando(false);
    if (error) {
      toast.error("Erro ao salvar item");
      return;
    }
    toast.success(editando ? "Item atualizado" : "Item cadastrado");
    setDialogOpen(false);
    fetchItens();
  }

  async function excluir() {
    if (!excluirId) return;
    const { error } = await supabase
      .from("patrimonio_administrativo")
      .delete()
      .eq("id", excluirId);
    if (error) {
      toast.error("Erro ao excluir item");
    } else {
      toast.success("Item excluído");
      fetchItens();
    }
    setExcluirId(null);
  }

  if (loading) return <ListSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Patrimônio</h1>
          <p className="text-sm text-[#6B7280]">Controle de bens e equipamentos administrativos</p>
        </div>
        <Button onClick={abrirNovo} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Item
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 text-[#6B7280] text-xs font-medium uppercase tracking-wide">
            <Package className="h-4 w-4" /> Total de Itens
          </div>
          <div className="text-3xl font-bold text-[#111827] mt-2">{kpis.total}</div>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 text-[#6B7280] text-xs font-medium uppercase tracking-wide">
            <DollarSign className="h-4 w-4" /> Valor Total do Patrimônio
          </div>
          <div className="text-3xl font-bold text-[#111827] mt-2">{formatarValor(kpis.valorTotal)}</div>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 text-[#6B7280] text-xs font-medium uppercase tracking-wide">
            <AlertCircle className="h-4 w-4" /> Itens sem Valor Informado
          </div>
          <div className="text-3xl font-bold text-[#111827] mt-2">{kpis.semValor}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar equipamento, série, patrimônio, colaborador..."
            className="pl-9"
          />
        </div>
        <Select value={filtroLocal} onValueChange={setFiltroLocal}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Local" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os locais</SelectItem>
            {locaisUnicos.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroSetor} onValueChange={setFiltroSetor}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Setor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os setores</SelectItem>
            {setoresUnicos.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
        {filtrados.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#6B7280]">
            Nenhum item de patrimônio cadastrado ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Marca/Modelo</TableHead>
                  <TableHead>Nº Série</TableHead>
                  <TableHead>Patrimônio</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.equipamento}</TableCell>
                    <TableCell>{i.marca_modelo || "—"}</TableCell>
                    <TableCell>{i.numero_serie || "—"}</TableCell>
                    <TableCell>{i.numero_patrimonio || "—"}</TableCell>
                    <TableCell>{i.local || "—"}</TableCell>
                    <TableCell>{i.setor || "—"}</TableCell>
                    <TableCell>{i.colaborador_responsavel || "—"}</TableCell>
                    <TableCell>{formatarValor(i.valor)}</TableCell>
                    <TableCell>
                      <span
                        className="text-xs font-medium px-2 py-1 rounded-full"
                        style={{
                          background: i.status === "Ativo" ? "#DCFCE7" : i.status === "Baixado" ? "#FEE2E2" : "#FEF3C7",
                          color: i.status === "Ativo" ? "#15803D" : i.status === "Baixado" ? "#B91C1C" : "#B45309",
                        }}
                      >
                        {i.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => abrirEditar(i)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700"
                          onClick={() => setExcluirId(i.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Dialog Novo/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Item" : "Novo Item"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2">
              <Label>Equipamento *</Label>
              <Input
                value={form.equipamento}
                onChange={(e) => setForm({ ...form, equipamento: e.target.value })}
                placeholder="Ex: Multímetro"
              />
            </div>
            <div>
              <Label>Marca/Modelo</Label>
              <Input
                value={form.marca_modelo}
                onChange={(e) => setForm({ ...form, marca_modelo: e.target.value })}
                placeholder="Ex: Minipa - ET1507B"
              />
            </div>
            <div>
              <Label>Nº de Série</Label>
              <Input
                value={form.numero_serie}
                onChange={(e) => setForm({ ...form, numero_serie: e.target.value })}
              />
            </div>
            <div>
              <Label>Patrimônio</Label>
              <Input
                value={form.numero_patrimonio}
                onChange={(e) => setForm({ ...form, numero_patrimonio: e.target.value })}
              />
            </div>
            <div>
              <Label>Local</Label>
              <Input
                value={form.local}
                onChange={(e) => setForm({ ...form, local: e.target.value })}
                placeholder="Ex: DSH, COMG, Oncocentro"
              />
            </div>
            <div>
              <Label>Setor</Label>
              <Input
                value={form.setor}
                onChange={(e) => setForm({ ...form, setor: e.target.value })}
                placeholder="Ex: Administrativo, Predial"
              />
            </div>
            <div>
              <Label>Colaborador Responsável</Label>
              <Input
                value={form.colaborador_responsavel}
                onChange={(e) => setForm({ ...form, colaborador_responsavel: e.target.value })}
              />
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: applyCurrencyMask(e.target.value) })}
                placeholder="R$ 0,00"
                inputMode="decimal"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Observação</Label>
              <Input
                value={form.observacao}
                onChange={(e) => setForm({ ...form, observacao: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!excluirId} onOpenChange={(open) => !open && setExcluirId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir item?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O item será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={excluir} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
